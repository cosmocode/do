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

    if (typeof addAutoCompletion !== 'undefined') {
        function prepareLi(li, value) {
            var name = value[0];
            li.innerHTML = '<a href="#">' + value[1] + ' (' + name + ')' + '</a>';
            li.id = 'bureaucracy__user__' + name.replace(/\W/g, '_');
            li._value = name;
        };
        function styleList(ul, input) {
            ul.style.position = 'relative';
            ul.style.left = input.previousSibling.style.width + 'px';
            ul.style.clear = 'both';
        };

        addAutoCompletion($('do__popup_assign'), 'bureaucracy_user_field', false, prepareLi, styleList);
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
            if (ele.parentNode.parentNode.className.indexOf('plugin_do_done') >= 0) {
                return false;
            }
            var dc = new Date();
            var y = parseInt(ele.innerHTML.substr(0,4), 10);
            if (y != dc.getFullYear()) {
                return y < dc.getFullYear();
            }
            var m = parseInt(ele.innerHTML.substr(5,2), 10);
            if (m != dc.getMonth() +1 ) {
                return m < dc.getMonth() + 1;
            }
            return parseInt(ele.innerHTML.substr(8,2), 10) < dc.getDate();
        };

        var me = e.target;
        while (me.tagName !== 'A') {
            me = me.parentNode;
            if (me === null) { return; }
        }
        var param = me.search.substring(1).replace(/&do=/,'&call=').replace(/^do=/,'call=');

        var done = (me.parentNode.className === 'plugin_do_done');

        var tablemode = false;
        if (me.parentNode.parentNode.tagName == 'TD') {
            tablemode = true;
        }


        var send = function(event) {
            removeEvent(div.lastChild.lastChild.lastChild,'click', send);
            $('do__commit_popup').style.display = 'none';
            var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
            if(ajax.failed) { return true; }

            if (!done) {
                var msg = $('do__popup_msg').value;
                var msge = msg.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;');
                if (tablemode) {
                    getElementsByClass('plugin_do_commit', me.parentNode.parentNode.parentNode, 'td')[0].innerHTML = (msge)?msge:'';
                } else {
                   getElementsByClass('plugin_do_commit', me.parentNode, 'span')[0].innerHTML = (msge)?'(' + LANG.plugins['do'].note_done + msge +')':'';
                }
                param+= "&do_commit=" + escape(msg);
            } else if (tablemode) {
                getElementsByClass('plugin_do_commit', me.parentNode.parentNode.parentNode, 'td')[0].innerHTML = '';
            }

            var image = getElementsByClass('plugin_do_img', me, 'IMG')[0];
            var donr = image.src.match(/do([0-9]+)\.png/)[1];
            image.src = DOKU_BASE + 'lib/plugins/do/pix/throbber.gif';
            image.title = '…';

            ajax.onCompletion = function(){
                var resp = this.response;

                var pagestat = getElementsByClass('plugin__do_pagetasks');

                if(resp){
                    if (resp == "-1") {
                       alert( LANG.plugins['do'].notloggedin );
                       image.src = DOKU_BASE + 'lib/plugins/do/pix/do' + donr + '.png';
                       return;
                    }

                    image.src = DOKU_BASE + 'lib/plugins/do/pix/do';
                    if      (donr == '3') { image.src += '7'; }
                    else if (donr == '4') { image.src += '8'; }
                    else if (donr == '6') { image.src += '1'; }
                    else if (donr == '5') { image.src += '2'; }
                    image.src += '.png';

                    me.parentNode.className ='plugin_do_done';
                    if (tablemode) {
                        me.parentNode.firstChild.innerHTML = JSINFO.plugin_do_user;
                    }
                    image.title = LANG.plugins['do'].done.replace(/%s/,resp);


                }else{
                    image.src = DOKU_BASE + 'lib/plugins/do/pix/do';
                    if      (donr == '7') { image.src += '3'; }
                    else if (donr == '8') { image.src += '4'; }
                    else if (donr == '1') { image.src += '6'; }
                    else if (donr == '2') { image.src += '5'; }
                    else    { image.src = donr; }
                    image.src += '.png';

                    me.parentNode.className = 'plugin_do_undone';
                    if (tablemode) {
                        me.parentNode.firstChild.innerHTML = '&nbsp;';
                    }
                    image.title = LANG.plugins['do'].open;
                }
                image.parentNode.firstChild.title = image.title;

                if (pagestat.length !== 0) {
                    var newCount = parseInt(pagestat[0].firstChild.innerHTML, 10);
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
                        if (newCount === 0) {
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
                    if (newCount === 0) {
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
        };


        if (me.parentNode.className === 'plugin_do_done') {
            send();
        } else {
            var close = function (event) {
                $('do__commit_popup').style.display = 'none';
            };
            $('do__popup_msg').value = '';


            var popup = $('do__commit_popup');
            popup.style.display = 'inline';
            $('do__popup_msg').focus();
            popup.style.top     = (e.clientY + 20) + 'px';

            var posX = e.clientX - popup.clientWidth/2;
            if (posX < 5) {
                posX = 5;
            }
            popup.style.left    = posX + 'px';

            addEvent(div.lastChild.lastChild.lastChild,'click', send);
            addEvent(div.firstChild.firstChild,'click', close);
        }

        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    // Status toggle
    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i],'click', handle_event);
    }

    // build commit popup
    var div = document.createElement('div');

    div.innerHTML = '<div class="title">' +
                    '<img src="' + DOKU_BASE + 'lib/images/close.png">' +
                    LANG.plugins['do'].popup_title + '</div>';

    var fieldset = '<fieldset>';
    fieldset += '<p><label for="do__popup_msg">' + LANG.plugins['do'].popup_msg + '</label>'
              + '<input class="edit" id="do__popup_msg" /></p>';

    div.innerHTML += fieldset + '<p class="plugin_do_insert"><button class="button">'
                   + LANG.plugins['do'].popup_submit
                   + '</button></p></fieldset>';

    div.id = 'do__commit_popup';

    // hide popup
    div.style.display = 'none';

    drag.attach(div, div.firstChild);

    // actions
    var close = function(event)
    {
        var div = $('do__commit_popup');
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

   var page = getElementsByClass('page', document, 'div');
    if (page) {
        page[0].appendChild(div);
    }

    // get initial task status
    if (getElementsByClass('plugin_do1', null, 'span').length ||
        getElementsByClass('plugin_do2', null, 'span').length ||
        getElementsByClass('plugin_do3', null, 'span').length ||
        getElementsByClass('plugin_do4', null, 'span').length) {

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
        if (ajax.failed) { return true; }

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
                    obj.parentNode.className = 'plugin_do_done';
                    var img = getElementsByClass('plugin_do_img',obj.parentNode,'img');
                    if (typeof(img) != 'undefined') {
                        var donr = img[0].src.match(/do([0-9])\.png/)[1];
                        img[0].src = DOKU_BASE + 'lib/plugins/do/pix/do';
                        if      (donr == '3') { img[0].src += '7'; }
                        else if (donr == '4') { img[0].src += '8'; }
                        else if (donr == '6') { img[0].src += '1'; }
                        else if (donr == '5') { img[0].src += '2'; }
                        img[0].src += '.png';
                    }
                    if (typeof(stat[i].msg) != 'undefined') {
                        var commitmsg = getElementsByClass('plugin_do_commit',obj.parentNode,'span')[0];
                        var msg = stat[i].msg.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;");
                        if (msg !== "") {
                            commitmsg.innerHTML = '(' +LANG.plugins['do'].note_done + msg + ')';
                        }
                    }
                }
            }
        };
        ajax.runAJAX();
    }
});

