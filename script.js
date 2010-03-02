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
    var edit = $(edid);
    var select = getSelection(edit);

    var div = document.createElement('div');
    div.innerHTML = '<div class="title">' +
                    '<img src="' + DOKU_BASE + 'lib/images/close.png">' +
                    '<span>' + LANG.plugins['do'].popup_title + '</span>' +
                    '</div>';

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
    edit.parentNode.appendChild(div);

    // hide popup
    div.style.display = 'none';

    drag.attach(div, div.firstChild);

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
            div.style.display = 'inline';
            div.style.top  = (event.pageY?event.pageY:event.clientY) + 'px';
            div.style.left = (event.pageX?event.pageX:event.clientX) + 'px';
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

        var sel = getSelection(edit);
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
        "icon":DOKU_BASE + 'lib/plugins/do/pix/toolbar.png'
    });
}

addInitEvent(function(){
    function handle_event(e){
        var me = e.target;
        if(me.tagName !== 'A') me = e.target.parentNode;
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

