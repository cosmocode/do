/**
 * Add button action for the do button
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function addBtnActionDo(btn, props, edid) {
    var select = null;

    var div = document.createElement('div');
    div.innerHTML = '<div class="title">' +
                    '<img src="' + DOKU_BASE + 'lib/images/close.png">' +
                    LANG.plugins['do'].popup_title + '</div>';

    var fieldset = '<fieldset>';
    var inps = ['assign', 'date'];
    for (var i = 0 ; i < inps.length ; ++i) {
        fieldset += '<p><label for="do__popup_' + inps[i] + '">' +
                          LANG.plugins['do']['popup_' + inps[i]] + '</label>' +
                          '<input class="edit" id="do__popup_' + inps[i] + '" /></p>';
    }
    div.innerHTML += fieldset + '<p class="plugin_do_insert"><button class="button">' + LANG.plugins['do'].popup_submit
                   + '</button></p></fieldset>';

    div.id              = 'do__popup';

    // hide popup
    div.style.display = 'none';

    drag.attach(div, div.firstChild);

    $('dw__editform').appendChild(div);

    if (typeof AutoCompletion !== 'undefined') {
        var user_AutoCompletion = AutoCompletion;
        user_AutoCompletion.prototype.prepareLi = function (li, value) {
            var name = value[0];
            li.innerHTML = '<a href="#">' + value[1] + ' (' + name + ')' + '</a>';
            li.id = 'bureaucracy__user__' + name.replace(/\W/g, '_');
            li._value = name;
        };
        user_AutoCompletion.prototype.styleList = function (ul, input) {
            ul.style.position = 'relative';
            ul.style.left = input.previousSibling.style.width + 'px';
            ul.style.clear = 'both';
        };

        new user_AutoCompletion($('do__popup_assign'), 'bureaucracy_user_field', false);
    }
    if (typeof calendar !== 'undefined') {
        calendar.set('do__popup_date');
    }

    // actions
    var close = function(event)
    {
        var div = $('do__popup');
        if (div.style.display === 'inline')
        {
            div.style.display = 'none';
        }
        else
        {
            select = getSelection($(edid));
            div.style.display = 'inline';
            div.style.top  = event.pageY + 'px';
            div.style.left = event.pageX + 'px';
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
    };

    addEvent(div.firstChild.firstChild,'click',close);
    addEvent(btn,'click',close);

    addEvent(div.lastChild.lastChild.lastChild,'click',function(e){
        // Validate data
        var out = '<do';
        if ($('do__popup_date').value && $('do__popup_date').value.match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/)) out += ' ' + $('do__popup_date').value;
        if ($('do__popup_assign').value)  out += ' ' + $('do__popup_assign').value;
        out +='>';

        var sel = getSelection($(edid));
        if(sel.start === 0 && sel.end === 0) sel = select;

        var stxt = sel.getText();

        if(stxt) out += stxt;
        out          += '</do>';

        pasteText(sel,out);
        div.style.display   = 'none';
        $('do__popup_date').value         = '';
        $('do__popup_assign').value       = '';
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
   return true;
}

if (typeof window.toolbar !== 'undefined') {
    window.toolbar.push({
        "type":"do",
        "title": LANG.plugins['do'].toolbar_title,
        // icon from Yusuke Kamiyamane - http://www.pinvoke.com/
        "icon":DOKU_BASE + 'lib/plugins/do/pix/toolbar.png'
    });
}

addInitEvent(function(){
    function handle_event(e){
        var isLate = function(ele) {
            if (typeof(ele.parentNode) == 'undefined') {
                return false;
            }
            if (ele.parentNode.parentNode.firstChild.className.indexOf('plugin_do_adone') >= 0) {
                return false;
            }
            var dc = new Date();
            var y = parseInt(ele.innerHTML.substr(0,4));
            if (y != dc.getFullYear()) {
                return y < dc.getFullYear();
            }
            var m = parseInt(ele.innerHTML.substr(5,2));
            if (m != dc.getMonth() +1 ) {
                return m < dc.getMonth() +1
            }
            return parseInt(ele.innerHTML.substr(8,2)) < dc.getDate();
        }

        var me = e.target;
        while (me.tagName !== 'A') {
            me = me.parentNode;
            if (me == null) return;
        }
        var param = me.search.substring(1).replace(/&do=/,'&call=').replace(/^do=/,'call=');

        var tablemode = false;
        if (me.parentNode.tagName == 'TD') {
            tablemode = true;
        }
        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
        ajax.AjaxFailedAlert = '';
        ajax.encodeURIString = false;
        if(ajax.failed) return true;

        var image = me.firstChild;
            image.style.backgroundImage = 'url(' + DOKU_BASE + 'lib/plugins/do/pix/throbber.gif)';
        image.title = '…';

        ajax.onCompletion = function(){
            var resp = this.response;

            var pagestat = getElementsByClass('plugin__do_pagetasks');

            if(resp){
                image.style.backgroundImage = '';
                me.className ='plugin_do_status plugin_do_adone';
                if (tablemode) {
                    me.firstChild.innerHTML = JSINFO['plugin_do_user'];
                }
                image.title = LANG.plugins['do'].done.replace(/%s/,resp);

            }else{
                image.style.backgroundImage = '';
                me.className = 'plugin_do_status';
                if (tablemode) {
                    me.firstChild.innerHTML = '&nbsp;';
                }
                image.title = LANG.plugins['do'].open;
            }

            if (pagestat.length != 0) {
                var newCount = parseInt(pagestat[0].firstChild.innerHTML);
                var newClass;
                var oldClass = pagestat[0].firstChild.className;
                var cdate = getElementsByClass('plugin_do_meta_date', me.parentNode, 'SPAN')[0];
                if (resp) {
                    if (newCount == 1) {
                        newClass = 'do_done';
                    } else if (oldClass != 'do_late'){
                        newClass = 'do_undone';
                    } else {
                        var dos = getElementsByClass('plugin_do_meta_date');
                        newClass = 'do_undone';
                        for (var i = 0; i<dos.length; i++) {
                            if (isLate(dos[i])) {
                                newClass = 'do_late';
                                break;
                            }
                        }
                    }
                    newCount-=1;
                } else {
                    if (newCount == 0) {
                        if (cdate) {
                            if (isLate(cdate)) {
                                newClass = 'do_late';
                            } else {
                                newClass = 'do_undone';
                            }
                        } else {
                            newClass = 'do_undone';
                        }
                    } else if (oldClass == 'do_late') {
                        newClass = 'do_late';
                    } else {
                        var dos = getElementsByClass('plugin_do_meta_date');
                        newClass = 'do_undone';
                        for (var i = 0; i<dos.length; i++) {
                            if (isLate(dos[i])) {
                                newClass = 'do_late';
                                break;
                            }
                        }
                    }
                    newCount+=1;
                }

                var title = LANG.plugins['do'].title_undone;
                if (newCount == 0) {
                    title = LANG.plugins['do'].title_done;
                }
                for (var i = 0; i < pagestat.length; i++) {
                    pagestat[i].firstChild.innerHTML = newCount;
                    pagestat[i].firstChild.className = newClass;
                    pagestat[i].title = title;
                }
            }

        };

        ajax.runAJAX(param);

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    // Status toggle
    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i],'click', handle_event);
    }

    if (getElementsByClass('plugin_do1', null, 'span').length ||
        getElementsByClass('plugin_do2', null, 'span').length ||
        getElementsByClass('plugin_do3', null, 'span').length ||
        getElementsByClass('plugin_do4', null, 'span').length) {

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
        if (ajax.failed) return true;

        ajax.setVar('do_page', JSINFO.id);
        ajax.setVar('call','plugin_do_status');

        ajax.onCompletion = function(){
            var resp = 'var stat = '+this.response;
            eval(resp);

            for(var i=0; i<stat.length; i++){
                var obj = document.getElementById('plgdo__'+stat[i].md5);
                if(obj){
                    obj.className += ' plugin_do_done';
                    obj.title += ' '+LANG.plugins['do'].done.replace(/%s/,stat[i].status);
                    obj.parentNode.className += ' plugin_do_adone';
                }
            }
        };
        ajax.runAJAX();
    }
});

