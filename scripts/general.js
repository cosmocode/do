

/**
 * Add button action for the do button
 *
 * @param  {jQuery} $btn   Button element to add the action to
 * @param  {Array}  props Associative array of button properties
 * @param  {string} edid  ID of the editor textarea
 * @return {string} If button should be appended return the id for in aria-controls, otherwise an empty string
 *
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function addBtnActionDo($btn, props, edid) {
    PluginDo.initDialog(edid);

    // add toolbar button action
    $btn.click(function(e) {
        PluginDo.toggleToolbarDialog(e);
    });

    return 'do';
}

/**
 * Append button to toolbar
 */
if (typeof window.toolbar !== 'undefined') {
    // icon from Yusuke Kamiyamane - http://www.pinvoke.com/
    window.toolbar.push({
        type: "do",
        title: LANG.plugins['do'].toolbar_title,
        icon: '../../plugins/do/pix/toolbar.png'
    });
}

jQuery(function () {
    // build commit popup
    var fieldsetcontent =
        '<p>' +
            '<label for="do__popup_msg">' +
                PluginDo.getLang("popup_msg") +
            '</label>' +
            '<input class="edit" id="do__popup_msg" />' +
        '</p>';

    PluginDo.createOverlay(
        LANG.plugins['do'].finish_popup_title,
        'do__commit_popup',
        fieldsetcontent,
        LANG.plugins['do'].finish_popup_submit,
        PluginDo.closeSingleTask
    );

    //clickable tasks
    jQuery(document).on('click', 'a.plugin_do_status', PluginDo.toggle_status);

    //update do items at page, so changes after last page render are shown
    var $items = jQuery('span.plugin_do_item');
    if ($items.length > 0) {

        //update titles of items with initial status info especially for tables
        $items.each(function (i, item) {
            PluginDo.buildTitle(jQuery(item), [], '', null, null);
        });

        // update items with info from sqlite,
        // ajax returns array with status info per task at page
        jQuery.ajax({
            type: "POST",
            url: DOKU_BASE + 'lib/exe/ajax.php',
            data: {
                call: 'plugin_do_status',
                do_page: JSINFO.id
            },
            success: PluginDo.updateItems,
            dataType: 'json'
        });
    }
});

var PluginDo = {

    /*******************************
     * General functions           *
     *******************************/

    /**
     * Create a floating, draggable overlay
     *
     * @param {string} title           The title line
     * @param {string} id              The id to assign to the overlay
     * @param {string} fieldsetcontent Content of the fieldset as HTML
     * @param {string} submitcaption   Label for the submit button
     * @param {Function} submitaction  callback What to do when submit is pressed
     * @returns HTMLElement The created overlay DOMObject
     */
    createOverlay: function (title, id, fieldsetcontent, submitcaption, submitaction) {
        // create overlay div
        var $dialog = jQuery(document.createElement('div'))
            .dialog({
                autoOpen: false,
                draggable: true,
                title: title,
                resizable: false
            })
            .html('<fieldset>' +
                fieldsetcontent +
                '<p class="button_wrap"><button class="button plugin_do_closetask">' +
                submitcaption +
                '</button></p>' +
                '</fieldset>')
            .parent()
            .attr('id', id)
            .addClass('plugin_do_popup')
            .hide()
            .appendTo('.dokuwiki:first');

        // add event handlers
        jQuery('#' + id + ' .ui-dialog-titlebar-close').click(function () { // close button
            $dialog.toggle();
        });

        $dialog
            .keydown(function (e) {
                if (e.keyCode !== 13) { //Enter
                    return true;
                }

                submitaction();
                $dialog.hide();

                e.preventDefault();
                e.stopPropagation();
                return false;
            })
            .find('.plugin_do_closetask').click(function (e) {
                submitaction();
                $dialog.hide();

                e.preventDefault();
                return false;
            });

        return $dialog;
    },

    /********************************************
     * functions for interactive tasks in pages     *
     ********************************************/

    /**
     * Toggle status of task, when symbol of task is clicked
     *
     * @param event
     * @returns {boolean}
     */
    toggle_status: function (event) {
        if (jQuery(this).parent().hasClass('plugin_do_done')) {
            //mark undone
            PluginDo.save_update_SingleTask(this);

        } else {
            //mark done, popup for commitmessage
            var $popup = jQuery('#do__commit_popup')
                .toggle()
                .css({
                    'position': 'absolute',
                    'top': (event.pageY + 10) + 'px',
                    'left': (event.pageX - 150) + 'px'
                });
            $popup[0].__me = this;
            jQuery('#do__popup_msg').focus();
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
    },

    /**
     * callback performs close action of Close dialog
     */
    closeSingleTask: function () {
        PluginDo.save_update_SingleTask(jQuery('#do__commit_popup')[0].__me);
        jQuery('#do__popup_msg').val('');
    },

    /**
     * Switch the status of a image src
     *
     * @param {boolean} done true for done tasks, false for undone
     * @param {jQuery}  $applyto jQuery object with DOM elements where to update images
     */
    switchDoNr: function (done, $applyto) {
        var newImg = done ? 'undone.png' : 'done.png';

        $applyto.find('img').attr('src', DOKU_BASE + 'lib/plugins/do/pix/' + newImg);
    },

    /**
     * Set the task title
     *
     * @param {Array}       assignees   assignees for the task, undefined for autodetect
     * @param {string}      due         the task's due date, undefined for autodetect
     * @param {string}      closedby    who closed the task, undefined for not closed, yet
     * @param {string}      closedon    when was the task closed, undefined for not closed, yet
     * @param {jQuery}      $applyto    jQuery object with DOM elements where to add the title tag, undefined for rootNode
     */
    buildTitle: function ($applyto, assignees, due, closedby, closedon) {
        var titelNo = 4;

        // determine assignees
        if (!assignees || !assignees.length) {
            //take the assignees of the first task or table row when tasks are duplicated
            var $assigneeobjs = $applyto.first().find('span.plugin_do_meta_user');
            if($assigneeobjs.length === 0) {
                $assigneeobjs = $applyto.parent('td').parent().first().find('td.plugin_do_assignee');
            }
            assignees = [];
            $assigneeobjs.each(function (i, assignee) {
                assignees.push(PluginDo.stripTags(jQuery(assignee).html()));
            });
        }
        if (assignees.length > 0) {
            titelNo -= 2;
        }

        // determine due date
        if (!due) {
            var $due = $applyto.first().find('span.plugin_do_meta_date');
            if($due.length === 0) {
                $due = $applyto.parent('td').parent().first().find('td.plugin_do_date');
            }
            due = PluginDo.stripTags($due.length ? $due.html() : '');
        }
        if (due !== '') {
            titelNo -= 1;
        }
        var newTitle = PluginDo.getLang('title' + titelNo, assignees.join(', '), due);

        // is closed?
        if (closedon) {
            newTitle += ' ' + PluginDo.getLang('done', closedon);
        }

        // who closed it?
        if (closedby || closedby === '') {
            if (closedby === '') closedby = LANG.plugins['do'].by_unknown;
            newTitle += ' ' + PluginDo.getLang('closedby', closedby);
        }

        // apply the title
        $applyto.attr('title', newTitle);
    },

    /**
     * get a localized string by name.
     *
     * if a arg is given it replaces %s with arg
     *
     * @return {string} localized text.
     */
    getLang: function (name, arg1, arg2) {
        var lang = LANG.plugins['do'][name];

        if (arg1 === null) {
            return lang;
        } else if(arg2 === null) {
            return lang.replace(/%(1\$)?(s|d)/, arg1);
        } else {
            return lang.replace(/%(1\$)?(s|d)/, arg1)
                       .replace(/%(2\$)?(s|d)/, arg2);
        }
    },

    /**
     * Escapes html entities from a string.
     */
    hsc: function (text) {
        return text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;');
    },

    /**
     * Removes tags from string
     *
     * @param {string} text
     * @returns {string} untagged text
     */
    stripTags: function (text) {
        return text.replace(/(<([^>]+)>)/ig, "");
    },

    /**
     * Determine if a element is late
     *
     * @param {HTMLElement} ele span with due date
     * @returns {boolean} whether task is still open and exceed due date
     */
    isLate: function (ele) {
        if (typeof ele.parentNode == 'undefined') {
            return false;
        }
        var $ele = jQuery(ele);

        if ($ele.parent().parent().hasClass('plugin_do_done')) {
            return false;
        }
        var currentdate = new Date(),
            duedate = new Date($ele.html());

        return duedate.getTime() < currentdate.getTime();
    },

    /**
     * Returns value of requested url parameter
     *
     * @param {string} url
     * @param {string} keyname
     * @returns {*}
     */
    urlParam: function (url, keyname) {
        var results = new RegExp('[\\?&]' + keyname + '=([^&#]*)').exec(url);
        if (results === null) {
            return null;
        } else {
            return results[1] || 0;
        }
    },

    /**
     * Update statistics in the page task status view
     *
     * done:   All tasks done
     * undone: There are %1$d open tasks
     * late:   There are %1$d open tasks, %2$d are late.'
     *
     * @param {string} response result return by ajax toggle request
     * @param {jQuery} $itemspan
     */
    updatePageTaskView: function (response, $itemspan) {
        var $pagestat = jQuery('.plugin__do_pagetasks');
        if ($pagestat.length > 0) {
            var count = parseInt($pagestat.children().first().html(), 10),
                latecount = 0,
                newClass,
                oldClass = $pagestat.children().first().attr('class'),
                $cdate = $itemspan.find('span.plugin_do_meta_date');

            if (response) {
                // task is marked done
                if (count == 1) {
                    newClass = 'do_done';
                } else if (oldClass != 'do_late') {
                    newClass = 'do_undone';
                } else {
                    newClass = 'do_undone';
                    jQuery('.plugin_do_meta_date')
                        .each(function (i, doitem) {
                            if (PluginDo.isLate(doitem)) {
                                newClass = 'do_late';
                                latecount++;
                            }
                        });
                }
                count -= 1;
            } else {
                //task is marked undone
                if (count === 0) {
                    if ($cdate.length && PluginDo.isLate($cdate[0])) {
                            newClass = 'do_late';
                            latecount++;
                    } else {
                        newClass = 'do_undone';
                    }
                } else {
                    newClass = 'do_undone';
                    jQuery('.plugin_do_meta_date')
                        .each(function (i, doitem) {
                            if (PluginDo.isLate(doitem)) {
                                newClass = 'do_late';
                                latecount++;
                            }
                        });
                }
                count += 1;
            }

            var title = PluginDo.getLang('title_' + newClass.substr(3), count, latecount);

            $pagestat
                .attr('title', title)
                .children().first()
                .html(count)
                .removeClass().addClass(newClass);
        }
    },

    /**
     * Save the task change to wiki and update the html in the page
     *
     * @param {HTMLElement} me clicked url element
     */
    save_update_SingleTask: function (me) {
        var $me = jQuery(me),
            $itemspan = $me.parent(),
            md5v = $itemspan.attr('class').match(/plugin_do_([a-f0-9]{32})/)[1],
            $dotags = jQuery('.plugin_do_' + md5v),

            done = $itemspan.hasClass('plugin_do_done'),
            param = {
                call: 'plugin_do',
                do_page: decodeURIComponent(PluginDo.urlParam(me.search.substring(1), 'do_page')),
                do_md5: decodeURIComponent(PluginDo.urlParam(me.search.substring(1), 'do_md5')),
                do_commit: jQuery('#do__popup_msg').val()
            };

        if (!done) {
            var commitmsg = PluginDo.hsc(param.do_commit);
            //update table(s)
            $dotags.parent('td').parent().find('td.plugin_do_commit').html(commitmsg ? commitmsg : '');
            //update task (inclusive duplicates)
            commitmsg = (commitmsg ? '&nbsp;(' + PluginDo.getLang("note_done") + commitmsg + ')' : '');
            $dotags.find('span.plugin_do_commit').html(commitmsg);
        } else {
            $dotags.parent('td').parent().find('td.plugin_do_commit').html('');
            $dotags.find('span.plugin_do_commit').html('');
        }

        var $image = $me.find('img');
        var donr = !$image.is("img[src*='undone.png']");
        $image.attr('src', DOKU_BASE + 'lib/images/throbber.gif');

        /**
         * callback to update task when it is toggled
         * @param response
         */
        var updateSingleTask = function (response) {
            var closedby = null,
                closedon = null;
            if (response == "-1" || response == "-2") {
                var langkey = 'notallowed';
                if(response == "-1") {
                    langkey = "notloggedin";
                }
                alert(PluginDo.getLang(langkey));

                //remove throbber
                PluginDo.switchDoNr(!donr, $me);
                return;
            }
            if (response) {
                $dotags.addClass('plugin_do_done');
                if (JSINFO.plugin_do_user_name) {
                    $dotags.parent('td').parent().find('td.plugin_do_status span span').html(JSINFO.plugin_do_user_name);
                }

                closedby = JSINFO.plugin_do_user_clean;
                closedon = response;
            } else {
                $dotags.removeClass('plugin_do_done');
                $dotags.parent('td').parent().find('td.plugin_do_status span span').html('&nbsp;');
            }
            PluginDo.switchDoNr(donr, $dotags);
            PluginDo.buildTitle($dotags, [], '', closedby, closedon);

            //update statistics in the page task status view
            PluginDo.updatePageTaskView(response, $itemspan);
        };

        //save changes, ajax returns data to mark fail or success
        jQuery.ajax({
            type: "POST",
            url: DOKU_BASE + 'lib/exe/ajax.php',
            data: param,
            success: updateSingleTask,
            dataType: 'json'
        });
    },

    /**
     * callback which updates do's in the page
     * so that task changes after last page render are displayed correctly
     *
     * @param {Array} doStates ajax response with info from sqlite about tasks in this page
     */
    updateItems: function (doStates) {

        jQuery.each(doStates, function (i, state) {
            var $dotags = jQuery('.plugin_do_' + state.md5);

            PluginDo.buildTitle($dotags, [], '', state.closedby, state.status);
            PluginDo.switchDoNr(!state.status, $dotags);
            if(state.status) {
                $dotags.addClass('plugin_do_done');
            }

            if (state.msg) {
                var msg = PluginDo.hsc(state.msg);
                $dotags.find('span.plugin_do_commit').html('&nbsp;(' + PluginDo.getLang("note_done") + msg + ')');
            }
        });
    },

    /********************************************
     * Toolbar functions                        *
     ********************************************/

    old_select: null,
    $toolbardialog: null,
    textarea: null,

    initDialog: function(edid) {
        PluginDo.textarea = jQuery('#' + edid)[0];

        var fieldsetcontent = '';
        jQuery.each(['assign', 'date'], function (i, input) {
            fieldsetcontent +=
                '<p>' +
                    '<label for="do__popup_' + input + '">' +
                        LANG.plugins['do']['popup_' + input] +
                    '</label>' +
                    '<input class="edit" id="do__popup_' + input + '" />' +
                '</p>';
        });

        // prepare hidden overlay
        PluginDo.$toolbardialog = PluginDo.createOverlay(
            LANG.plugins['do'].popup_title,
            'do__popup',
            fieldsetcontent,
            LANG.plugins['do'].popup_submit,
            PluginDo.insertDoSyntax
        );

        jQuery('#do__popup_date').datepicker({
            dateFormat: "yy-mm-dd",
            changeMonth: true,
            changeYear: true
        });

        // if the bureaucracy plugin is installed, use its user autocompletion
        jQuery('#do__popup_assign').addClass('userspicker');
    },

    toggleToolbarDialog: function (e) {
        PluginDo.old_select = DWgetSelection(PluginDo.textarea);
        var $popup_date = jQuery('#do__popup_date');
        var $popup_assign = jQuery('#do__popup_assign');

        //check if a task was selected and load it's data
        var txt = PluginDo.old_select.getText();
        $popup_date.val('');
        $popup_assign.val('');
        var m = txt.match(/<do ([^>]*)>[\s\S]*<\/do>/);
        if (m) {
            var users = m[1];
            m = users.match(/\d\d\d\d-\d\d-\d\d/);
            if (m) {
                var date = m[0];
                users = users.replace(date, '');
                $popup_date.val(date);
            }
            users = users.replace(/^\s+/, '');
            users = users.replace(/\s+$/, '');
            $popup_assign.val(users);
        }

        PluginDo.$toolbardialog.css({
            'position': 'absolute',
            'top': (e.pageY + 10) + 'px',
            'left': (e.pageX - 100) + 'px'
        });
        return PluginDo.$toolbardialog.toggle();
    },

    /**
     * The submit action of toolbar dialog
     */
    insertDoSyntax: function () {
        // Validate data
        var $popup_date = jQuery('#do__popup_date');
        var $popup_assign = jQuery('#do__popup_assign');

        var pre = '<do';
        if ($popup_date.val() && $popup_date.val().match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/)) {
            pre += ' ' + $popup_date.val();
        }
        if ($popup_assign.val()) {
            pre += ' ' + $popup_assign.val();
        }
        pre += '>';

        var sel = DWgetSelection(PluginDo.textarea);
        if (sel.start === 0 && sel.end === 0) sel = PluginDo.old_select;

        var stxt = sel.getText();

        //strip any previous do tags
        var m = stxt.match(/<do ([^>]*)>[\s\S]*<\/do>/);
        if (m) {
            // we have previous tags, replace them
            stxt = stxt.replace(/<do ([^>]*)>/, pre);
        } else {
            // no selection or previous tags, add them
            stxt = pre + stxt + '</do>';
        }

        pasteText(sel, stxt);
        $popup_date.val('');
        $popup_assign.val('');
    }
};
