

function plugin_do__createOverlay(title, id, content, submitcaption, submitaction) {
    var div = document.createElement('div');
    content = '<div class="title">' +
                    '<img src="' + DOKU_BASE + 'lib/images/close.png">' +
                    title + '</div><fieldset>' + content;

    content += '<p class="button_wrap"><button class="button">' +
               submitcaption + '</button></p>';

    div.innerHTML = content + '</fieldset>';

    div.id        = id;
    div.className = 'plugin_do_popup';

    // hide popup
    div.style.display = 'none';

    div.__close = function(event)
    {
        if (div.style.display === 'inline')
        {
            div.style.display = 'none';
        }
        else
        {
            div.style.display = 'inline';
            div.style.top  = event.pageY + 'px';
            div.style.left = event.pageX + 'px';
        }
    };

    addEvent(div.firstChild.firstChild,'click',div.__close);
    addEvent(div.lastChild.lastChild.lastChild,'click',function(e){
        submitaction();
        div.__close();

        e.preventDefault();
        return false;
    });

    addEvent(div,'keydown',function (e) {
        if(e.keyCode !== 13){ //Enter
            return;
        }

        submitaction();
        div.__close();

        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    drag.attach(div, div.firstChild);
    getElementsByClass('dokuwiki', document.body, 'div')[0].appendChild(div);
    return div;
}

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
    var old_select = null;

    var fieldset = '';
    var inps = ['assign', 'date'];
    for (var i = 0 ; i < inps.length ; ++i) {
        fieldset += '<p><label for="do__popup_' + inps[i] + '">' +
                          LANG.plugins['do']['popup_' + inps[i]] + '</label>' +
                          '<input class="edit" id="do__popup_' + inps[i] + '" /></p>';
    }

    function onclick() {
        // Validate data
        var out = '<do';
        if ($('do__popup_date').value && $('do__popup_date').value.match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/)) out += ' ' + $('do__popup_date').value;
        if ($('do__popup_assign').value)  out += ' ' + $('do__popup_assign').value;
        out +='>';

        var sel = getSelection($(edid));
        if(sel.start === 0 && sel.end === 0) sel = old_select;

        var stxt = sel.getText();

        if(stxt) out += stxt;
        out          += '</do>';

        pasteText(sel,out);
        $('do__popup_date').value         = '';
        $('do__popup_assign').value       = '';
    }

    var div = plugin_do__createOverlay(LANG.plugins['do'].popup_title,
                                       'do__popup',
                                       fieldset,
                                       LANG.plugins['do'].popup_submit,
                                       onclick);
    addEvent(btn,'click', function (e) {
        old_select = getSelection($(edid));
        return div.__close(e);
    });

    if (typeof addAutoCompletion !== 'undefined') {
        function prepareLi(li, value) {
            var name = value[0];
            li.innerHTML = '<a href="#">' + value[1] + ' (' + name + ')' + '</a>';
            li.id = 'bureaucracy__user__' + name.replace(/\W/g, '_');
            li._value = name;
        };

        addAutoCompletion($('do__popup_assign'), 'bureaucracy_user_field', true, prepareLi);
    }
    if (typeof calendar !== 'undefined') {
        calendar.set('do__popup_date');
    }

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
    /**
     * switch the status of a image src
     *
     * done <-> undone
     * @param img image to change.
     * @param doNr boolean value. true for done tasks false for undone.
     */
    function switchDoNr (image, done, applyto) {
        if (isUndefined(done)) {
            done = isEmpty(image.src.match(/undone\.png/));
        }
        var newImg = done ? 'undone.png' : 'done.png';

        if (isUndefined(applyto)) {
            image.src = DOKU_BASE + 'lib/plugins/do/pix/' + newImg;
        } else {
            for (var i = 0; i < applyto.length; i++) {
                var img = applyto[i].getElementsByTagName('IMG');
                if (img.length === 1) {
                    img[0].src = DOKU_BASE + 'lib/plugins/do/pix/' + newImg;
                }
            }
        }
    }

    /**
     * Set the task title
     *
     * @param DOMObject   rootNode    the surrounding span.
     * @param [string]    assignees   assignees for the task, undefined for autodetect
     * @param string      due         the task's due date, undefined for autodetect
     * @param string      closedby    who closed the task, undefined for not closed, yet
     * @param string      closedon    when was the task closed, undefined for not closed, yet
     * @param [DOMObject] applyto     where to add the title tag, undefinded for rootNode
     */
    function buildTitle (rootNode, assignees, due, closedby, closedon, applyto) {
        var newTitle = 4;

        var table = rootNode.parentNode.tagName === 'TD';

        // determine assignees
        if (isUndefined(assignees) || isEmpty(assignees)) {
            var assigneeobjs = null;
            assignees = new Array();
            if (table) {
                assigneeobjs = getElementsByClass('plugin_do_assignee', rootNode.parentNode.parentNode, 'td');
            } else {
                assigneeobjs = getElementsByClass('plugin_do_meta_user', rootNode, 'span');
            }
            for(var i=0; i<assigneeobjs.length; i++){
                assignees.push(stripTags(assigneeobjs[i].innerHTML));
            }
        }
        if (assignees.length != 0) {
            newTitle -= 2;
        }

        // determine due date
        if (isUndefined(due)|| isEmpty(due)) {
            if (table) {
                due = getInnerHtmlByClass('plugin_do_date', rootNode.parentNode.parentNode, 'td');
            } else {
                due = getInnerHtmlByClass('plugin_do_meta_date', rootNode, 'span');
            }
            due = stripTags(due);
        }
        if (due !== '') {
            newTitle -= 1;
        }
        newTitle = LANG.plugins['do']['title' + newTitle].replace(/%(1\$)?s/, assignees.join(', ')).replace(/%(2\$)?s/, due);

        // is closed?
        if (!isUndefined(closedon)) newTitle += ' ' + getText('done', closedon);

        // who closed it?
        if (!isUndefined(closedby)) {
            if (closedby === '') closedby = LANG.plugins['do'].by_unknown;
            newTitle += ' ' + getText('closedby', closedby);
        }

        // apply the title
        if (isUndefined(applyto)) {
            applyto = [rootNode];
        }
        for (var j = 0; j < applyto.length; j++) {
            applyto[j].title = newTitle;
        }
    }

    /**
     * get the inner HTML content from a given class.
     *
     * parameters are equal to getElementsByClass()
     * @return inner content or empty string.
     */
    function getInnerHtmlByClass(className, parentNode, tag) {
        var elements = getElementsByClass(className, parentNode, tag);
        if (typeof(elements[0]) === 'undefined') {
            return '';
        } else {
            return elements[0].innerHTML;
        }

    }

    /**
     * get a localized string by name.
     *
     * if a arg is given it replaces %s with arg
     *
     * @return localized text.
     */
    function getText(name, arg) {
        if (arg === null) {
            return LANG.plugins['do'][name];
        } else {
            return LANG.plugins['do'][name].replace(/%s/,arg);
        }
    }

    /**
     * escapes html entities from a string.
     */
    function hsc(text) {
        return text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;');
    }

    function stripTags(text) {
        return text.replace(/(<([^>]+)>)/ig,"");
    }

    /**
     * determine if a element is late
     */
    function isLate(ele) {
        if (isUndefined(ele.parentNode)) {
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
    }

    var send = function(me) {
        var md5v = me.parentNode.className.match(/plugin_do_([a-f0-9]{32})/)[1];
        var dotags = getElementsByClass('plugin_do_' + md5v);

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
        ajax.AjaxFailedAlert = '';
        ajax.encodeURIString = false;
        if(ajax.failed) { return true; }

        var param = me.search.substring(1).replace(/&do=/,'&call=').replace(/^do=/,'call=');

        var tablemode = (me.parentNode.parentNode.tagName == 'TD');
        var done = me.parentNode.className.match(/\bplugin_do_done\b/);

        if (!done) {
            var msg = $('do__popup_msg').value;
            var msge = hsc(msg);
            if (tablemode) {
                getElementsByClass('plugin_do_commit', me.parentNode.parentNode.parentNode, 'td')[0].innerHTML = (msge)?msge:'';
            } else {
                var out = (isEmpty(msge)) ? '' : '&nbsp;(' + getText("note_done") + msge +')';
                for (var i = 0; i < dotags.length; i++) {
                    getElementsByClass('plugin_do_commit', dotags[i], 'span')[0].innerHTML = out;
                }
            }
            param+= "&do_commit=" + encodeURIComponent(msg);
        } else if (tablemode) {
            getElementsByClass('plugin_do_commit', me.parentNode.parentNode.parentNode, 'td')[0].innerHTML = '';
        }

        var image = me.getElementsByTagName('IMG')[0];
        var donr = isEmpty( image.src.match(/undone\.png/) );
        image.src = DOKU_BASE + 'lib/images/throbber.gif';

        ajax.onCompletion = function(){
            var resp = this.response;
            var pagestat = getElementsByClass('plugin__do_pagetasks');

            if(resp){
                if (resp == "-1") {
                   alert(getText("notloggedin"));
                   image.src = DOKU_BASE + 'lib/plugins/do/pix/' + (donr?'done':'undone') + '.png';
                   return;
                }
                switchDoNr(image, donr, dotags);
                for (var i = 0; i<dotags.length; i++) dotags[i].className += ' plugin_do_done';
                if (tablemode && typeof JSINFO.plugin_do_user_name !== 'undefined') {
                    me.parentNode.firstChild.nextSibling.innerHTML = JSINFO.plugin_do_user_name;
                }
                buildTitle(me.parentNode, '', '', JSINFO.plugin_do_user_clean, resp, dotags);
            }else{
                switchDoNr( image, donr, dotags);
                for (var i = 0; i<dotags.length; i++) {
                    dotags[i].className = dotags[i].className.replace(/plugin_do_done/g, '');
                }
                if (tablemode) {
                    me.parentNode.firstChild.nextSibling.innerHTML = '&nbsp;';
                }
                buildTitle(me.parentNode, '', '', undefined, undefined, dotags);
            }

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

                var title = getText("title_undone");
                if (newCount === 0) {
                    title = getText("title_done");
                }
                for (var i = 0; i < pagestat.length; i++) {
                    pagestat[i].firstChild.innerHTML = newCount;
                    pagestat[i].firstChild.className = newClass;
                    pagestat[i].title = title;
                }
            }

        };
        ajax.runAJAX(param);

        return false;
    };

    // build commit popup
    var fieldset = '<p><label for="do__popup_msg">' + getText("popup_msg") + '</label>'
                 + '<input class="edit" id="do__popup_msg" /></p>';


    plugin_do__createOverlay(LANG.plugins['do'].finish_popup_title,
                             'do__commit_popup',
                             fieldset,
                             LANG.plugins['do'].finish_popup_submit,
                             function () {
                                 send($('do__commit_popup').__me);
                                 $('do__popup_msg').value = '';
                             });

    // Status toggle
    function toggle_status(e){
        if (this.parentNode.className.match(/\bplugin_do_done\b/)) {
            send(this);
        } else {
            var popup = $('do__commit_popup');
            popup.__close({ 'pageX': findPosX(this), 'pageY': findPosY(this)});
            popup.__me = this;
            $('do__popup_msg').focus();
        }
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i], 'click', toggle_status);
    }

    // get initial task status
    var items = getElementsByClass('plugin_do_item', document, 'span');
    if (items.length > 0) {

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
        if (ajax.failed) { return true; }

        ajax.setVar('do_page', JSINFO.id);
        ajax.setVar('call','plugin_do_status');

        for (var i = 0; i < items.length; i++) {
            buildTitle(items[i]);
        }

        ajax.onCompletion = function(){
            var stat = eval(this.response);

            for(var i=0; i<stat.length; i++){
                if (!stat[i]['status']) {
                    continue;
                }

                var objs = getElementsByClass('plugin_do_'+stat[i].md5);

                for (var j = 0; j<objs.length; j++) {
                    var obj = objs[j];
                    if(obj){
                        buildTitle(obj, '', '', stat[i].closedby, stat[i].status);
                        obj.className += ' plugin_do_done';

                        var img = obj.getElementsByTagName('IMG')[0];
                        if (typeof(img) != 'undefined') {
                            switchDoNr(img);
                        }
                        if (typeof(stat[i].msg) != 'undefined') {
                            var commitmsg = getElementsByClass('plugin_do_commit',obj.parentNode,'span')[0];
                            var msg = hsc(stat[i].msg);
                            if (msg !== "") {
                                commitmsg.innerHTML = '&nbsp;(' + getText("note_done") + msg + ')';
                            }
                        }
                    }
                }
            }
        };
        ajax.runAJAX();
    }
});
