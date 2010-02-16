function plugindo_taskvisualization(){
    if(getElementsByClass('plugin_do1',null,'span').length ||
       getElementsByClass('plugin_do2',null,'span').length ||
       getElementsByClass('plugin_do3',null,'span').length ||
       getElementsByClass('plugin_do4',null,'span').length){

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
        if(ajax.failed) return true;

        ajax.setVar('do_page', JSINFO['id']);
        ajax.setVar('call','plugin_do_status');

        ajax.onCompletion = function(){
            var resp = 'var stat = '+this.response;
            eval(resp);

            for(var i=0; i<stat.length; i++){
                var obj = document.getElementById('plgdo__'+stat[i].md5);
                if(obj){
                    obj.className += ' plugin_do_done';
                    obj.title += ' '+LANG['plugins']['do']['done'].replace(/%s/,stat[i].status);
                }
            }
        };
        ajax.runAJAX();
    }
}

function do_createPopup(edit,btn)
{

    var select = getSelection(edit);

    var div         = document.createElement('div');
    var title       = document.createElement('div');
    var titletext   = document.createElement('span');
    var closeimg    = document.createElement('img');
    var form        = document.createElement('fieldset');
    var assignp     = document.createElement('p');
    var assignl     = document.createElement('label');
    var assigni     = document.createElement('input');
    var datep       = document.createElement('p');
    var datel       = document.createElement('label');
    var datei       = document.createElement('input');
    var actp        = document.createElement('p');
    var acts        = document.createElement('button');

    // append everything
    div.appendChild(title);
    div.appendChild(form);
    title.appendChild(closeimg);
    title.appendChild(titletext);
    form.appendChild(assignp);
    form.appendChild(datep);
    form.appendChild(actp);
    assignp.appendChild(assignl);
    assignp.appendChild(assigni);
    datep.appendChild(datel);
    datep.appendChild(datei);
    actp.appendChild(acts);
//    body.appendChild(div);
    edit.parentNode.appendChild(div);

    // set id from the popup
    div.id              = 'do__popup';
    datei.id            = 'do__popup_date';
    assigni.id          = 'do__popup_assign';

    // for
    datel.htmlFor       = 'do__popup_date';
    assignl.htmlFor     = 'do__popup_assign';

    // set class names
    title.className     = 'title';
    datep.className     = 'inp';
    assigni.className   = 'edit';
    datei.className     = 'edit';
    actp.className      = 'button';

    // image :)
    closeimg.src = '/lib/images/close.png';

    // set text
    titletext.innerHTML = 'Task erstellen';
    assignl.innerHTML   = 'Assign to';
    datel.innerHTML     = 'Due on';
    acts.innerHTML      = 'Insert';

    // hide popup
    div.style.display = 'none';

    drag.attach(div,title);

    // actions
    var close = function(event)
    {
        var div = $('do__popup');
        if (div.style.display == 'inline')
        {
            div.style.display = 'none';
        }
        else
        {
            div.style.display = 'inline';
            div.style.top = event.pageY + 'px';
            div.style.left = event.pageX + 'px';
        }
        return false;
    };

    addEvent(closeimg,'click',close);
    addEvent(btn,'click',close);

    addEvent(acts,'click',function(){
        var out = '<do';
        if (datei.value)    out += ' ' + datei.value;
        if (assigni.value)  out += ' ' + assigni.value;
        out +='>';

        var sel = getSelection(edit);
        if(sel.start == 0 && sel.end == 0) sel = selection;

        var stxt = sel.getText();
//        if(!stxt && !DOKU_UHC) stxt=title;

        if(stxt) out += stxt;
        out += '</do>';

        pasteText(sel,out);
        div.style.display = 'none';
        datei.value = '';
        assigni.value = '';
        return false;
    });

}
/**
 * Add button action for the link wizard button
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function addBtnActionDo(btn, props, edid)
{
//    linkwiz.init($(edid));
      do_createPopup($(edid),btn);

/*      addEvent(btn,'click',function(){
//        linkwiz.toggle();
        alert('bla');
        return false;
    });*/
    return true;
}

function do_toolbarButton()
{
    if (window.toolbar != undefined)
    {
        window.toolbar[window.toolbar.length] = {
            "type":"do",
            "title":"Insert new Task",
            "icon":"/lib/plugins/do/pix/toolbar.png"
        }
    }
}
addInitEvent(do_toolbarButton);
addInitEvent(function(){
    // Status toggle
    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i],'click',function(e){
            var me = e.target;
            if(me.tagName != 'A') me = e.target.parentNode;
            var param = me.search.substring(1).replace(/&do=/,'&call=');


            var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
            if(ajax.failed) return true;

            ajax._image = me.firstChild;
            ajax._image.src = DOKU_BASE+'lib/plugins/do/pix/throbber.gif';
            ajax._image.title = '...';

            ajax.onCompletion = function(){
                var resp = this.response;
                if(resp){
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_done.png';
                    this._image.title = LANG['plugins']['do']['done'].replace(/%s/,resp);
                }else{
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_open.png';
                    this._image.title = LANG['plugins']['do']['open'];
                }
            };

            ajax.runAJAX(param);


            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }

    plugindo_taskvisualization();
});

