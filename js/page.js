

var PluginDoPageStatus = function() {

    this.initStatus();
    this.initEvents();

};

PluginDoPageStatus.prototype.initStatus = function() {
    var that = this;
    jQuery.ajax({
        type: "POST",
        url: DOKU_BASE + 'lib/exe/ajax.php',
        data: {
            do_page: JSINFO.id,
            call: 'plugin_do_status'
        },
        dataType:'json'
    }).done(function(msg) {
        that.setupStatus(msg);
    });
};

PluginDoPageStatus.prototype.setupStatus = function(msg) {
    var that = this;
    jQuery.each(msg, function(index, status) {
        var statusElements = jQuery('.plugin_do_'+status.md5);

        if (!status['status']) {
            that.buildTitleForElements(statusElements);
            return;
        }

        that.buildTitleForElements(statusElements, '', '', status.closedby, status.status);
        statusElements.addClass('plugin_do_done');

        var img = statusElements.find('img:first');
        if (img.length === 1) {
           that.switchDoNumber(img[0]);
        }

        if (typeof(status.msg) != 'undefined') {
            if (status.msg !== "") {
                var commitMsg = statusElements.find('span.plugin_do_commit')
                    .text('&nbsp;(' + that.getText("note_done") + msg + ')');
            }
        }

    })
};

/**
 * switch the status of a image src
 *
 * done <-> undone
 * @param image   image to change.
 * @param done    boolean value. true for done tasks false for undone. leave undefined for autodetect
 * @param applyTo can be undefined
 */
PluginDoPageStatus.prototype.switchDoNumber = function(image, done, applyTo) {
    if (typeof done === 'undefined') {
        done = image.src.match(/undone\.png/) == null;
    }
    var newImg = done ? 'undone.png' : 'done.png';

    if (typeof applyTo === 'undefined') {
        image.src = DOKU_BASE + 'lib/plugins/do/pix/' + newImg;
        return;
    }

    for (var i = 0; i < applyTo.length; i++) {
        var img = applyTo[i].getElementsByTagName('IMG');
        if (img.length === 1) {
            img[0].src = DOKU_BASE + 'lib/plugins/do/pix/' + newImg;
        }
    }
};

PluginDoPageStatus.prototype.initEvents = function() {
    var that = this;
    jQuery('a.plugin_do_status').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        that.toggleStatus(e);
        return false;
    });
};

PluginDoPageStatus.prototype.toggleStatus = function(e){
    if (jQuery(e.target).parents('span').hasClass('plugin_do_done')) {
        this.send(e.target);
    } else {
        this.send(e.target, '');
        // FIXME commit message dialog
    }

};

PluginDoPageStatus.prototype.send = function(target, msg) {

    var md5v = jQuery(target).parents("span.plugin_do_item:first").attr("class")
        .match(/plugin_do_([a-f0-9]{32})/)[1];
    var doTags = jQuery('.plugin_do_' + md5v);

    var tableMode = (target.parentNode.parentNode.tagName == 'TD' &&
        target.parentNode.parentNode.className.match(/\bplugin_do_\w+\b/));
    var done = target.parentNode.className.match(/\bplugin_do_done\b/);

    if (typeof msg === 'undefined') msg = '';

    if (!done) {
        if (tableMode) {
            jQuery(target.parent).find('.plugin_do_commit').text(msg);
        } else {
            var out = msg;
            if (msg.length !== 0) {
                out = '&nbsp;(' + this.getText("note_done") + msg +')';
            }
            doTags.find('plugin_do_commit').text(out);
        }
    } else if (tableMode) {
        target.parents('tr > plugin_do_commit').find('.plugin_do_commit').text('');
    }

    var image = jQuery(target);
    //var donr = isEmpty( image.src.match(/undone\.png/) );
    image.attr('src', DOKU_BASE + 'lib/images/throbber.gif');


    var param = target;
    if (target.tagName !== 'A') {
        param = jQuery(target).parents('a:first')[0];
    }
    param = param.search.substring(1).replace(/&do=/,'&call=').replace(/^do=/,'call=');

    if (!done) {
        param += "&do_commit=" + encodeURIComponent(msg);
    }

    var that = this;
    jQuery.ajax({
        type: "POST",
        url: DOKU_BASE + 'lib/exe/ajax.php?' + param
    }).done(function(msg) {
        if (!that.reRenderEntries(target, msg, image, done, doTags, tableMode)) {
            return;
        }
        that.updatePageStatus(target, msg);
    });
    return false;
};

PluginDoPageStatus.prototype.reRenderEntries = function(target, response, image, previousState, doTags, tableMode) {
    if(response) {
        if (response == "-1") {
            alert(this.getText("notloggedin"));
            image.attr('src', DOKU_BASE + 'lib/plugins/do/pix/' + (previousState?'done':'undone') + '.png');
            return false;
        }

        this.switchDoNumber(image, false, doTags);
        doTags.addClass('plugin_do_done');

        if (tableMode && typeof JSINFO.plugin_do_user_name !== 'undefined') {
            jQuery(target).parents('tr:first').find('.plugin_do_creator').text(JSINFO.plugin_do_user_name);
        }
        this.buildTitle(target.parentNode, '', '', JSINFO.plugin_do_user_clean, response, doTags);
        return true;
    }
    this.switchDoNumber( image, true, doTags);

    doTags.removeClass('plugin_do_done');

    if (tableMode) {
        jQuery(target).parents('tr:first').find('.plugin_do_creator').text('');
    }
    this.buildTitle(target.parentNode, '', '', undefined, undefined, doTags);
    return true;
};

PluginDoPageStatus.prototype.updatePageStatus = function(target, response) {

    var pageStats = jQuery('.plugin__do_pagetasks');
    var that = this;

    if (pageStats.length === 0) {
        return;
    }
    var span = pageStats.find('span');
    var newCount = parseInt(span.first().text(), 10);
    var newClass;
    var oldClass = span.first().attr('class');
    var dos;
    var cDate = jQuery(target).parents('tr:first').find('.plugin_do_meta_date:first');
    if (response) { // task closed
        if (newCount == 1) {
            newClass = 'do_done';
        } else if (oldClass != 'do_late'){
            newClass = 'do_undone';
        } else {
            newClass = 'do_undone';
            jQuery('.plugin_do_meta_date').each(function(index, element) {
                if (that.isLate(element)) {
                    newClass = 'do_late';
                    return false;
                }
                return true;
            });
        }
        newCount-=1;
    } else { // task reopened
        if (newCount === 0) {
            if (cDate) {
                if (this.isLate(cDate)) {
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
            dos =
            newClass = 'do_undone';
            jQuery('.plugin_do_meta_date').each(function(index, element) {
                if (that.isLate(element)) {
                    newClass = 'do_late';
                    return false;
                }
                return true;
            });
        }
        newCount+=1;
    }

    var title = this.getText("title_undone");
    if (newCount === 0) {
        title = this.getText("title_done");
    }
    span.text(newCount);
    span.attr('class', newClass);
    pageStats.attr('title', title);
};

/**
 * determine if a element is late
 */
PluginDoPageStatus.prototype.isLate = function(element) {
    if (typeof element.parentNode == 'undefined') {
        return false;
    }

    if (jQuery(element).parents('.plugin_do_done').length > 0) {
        return false;
    }
    var dc = new Date();
    var y = parseInt(element.innerHTML.substr(0,4), 10);
    if (y != dc.getFullYear()) {
        return y < dc.getFullYear();
    }
    var m = parseInt(element.innerHTML.substr(5,2), 10);
    if (m != dc.getMonth() +1 ) {
        return m < dc.getMonth() + 1;
    }
    return parseInt(element.innerHTML.substr(8,2), 10) < dc.getDate();
};

PluginDoPageStatus.prototype.buildTitleForElements = function(elements, assignees, due, closedby, closedon, applyto) {
    var that = this;
    elements.each(function(index, element) {
        that.buildTitle(element, assignees, due, closedby, closedon, applyto);
    });
};

/**
 * Set the task title
 *
 * @param rootNode    DOMObject   the surrounding span.
 * @param assignees   [string]    assignees for the task, undefined for autodetect
 * @param due         string      the task's due date, undefined for autodetect
 * @param closedby    string      who closed the task, undefined for not closed, yet
 * @param closedon    string      when was the task closed, undefined for not closed, yet
 * @param applyto     [DOMObject] where to add the title tag, undefinded for rootNode
 */
PluginDoPageStatus.prototype.buildTitle = function(rootNode, assignees, due, closedby, closedon, applyto) {
    var newTitle = 4;

    assignees = this.getAssigneesFromSpan(rootNode, assignees);
    if (assignees.length != 0) {
        newTitle -= 2;
    }
    due = this.getDateFromSpan(rootNode, due);

    if (due !== '') {
        newTitle -= 1;
    }
    newTitle = LANG.plugins['do']['title' + newTitle]
        .replace(/%(1\$)?s/, assignees.join(', '))
        .replace(/%(2\$)?s/, due);


    // is closed?
    if (typeof closedon !== 'undefined') newTitle += ' ' + this.getText('done', closedon);

    // who closed it?
    if (typeof closedby !== 'undefined') {
        if (closedby === '') closedby = this.getText('by_unknown', null);
        newTitle += ' ' + this.getText('closedby', closedby);
    }

    // apply the title
    if (typeof applyto === 'undefined') {
        applyto = [rootNode];
    }
    for (var j = 0; j < applyto.length; j++) {
        applyto[j].title = newTitle;
    }

};

PluginDoPageStatus.prototype.getAssigneesFromSpan = function(element, assignees) {
    var inTable = element.parentNode.tagName === 'TD';

    // determine assignees
    if (typeof assignees !== 'undefined' && assignees.length !== 0) {
        return assignees;
    }

    var assigneeElements = null;
    if (inTable) {
        assigneeElements = jQuery(element.parentNode.parentNode).find('td.plugin_do_assignee');
    } else {
        assigneeElements = jQuery(element).find('span.plugin_do_meta_user');
    }

    assignees = [];
    assigneeElements.each(function(index, value) {
        assignees.push(jQuery(value).text());
    });

    return assignees;
};

PluginDoPageStatus.prototype.getDateFromSpan = function(element, due) {
    var inTable = element.parentNode.tagName === 'TD';

    // determine due date
    if (typeof due !== 'undefined' && due.length !== 0) {
        return due;
    }

    if (inTable) {
        return jQuery(element.parentNode.parentNode)
            .find('td.plugin_do_date')
            .text();
    }
    return jQuery(element)
        .find('span.plugin_do_meta_date')
        .text();
};

/**
 * get a localized string by name.
 *
 * if a arg is given it replaces %s with arg
 *
 * @return localized text.
 */
PluginDoPageStatus.prototype.getText = function(name, arg) {
    if (arg === null) {
        return LANG.plugins['do'][name];
    } else {
        return LANG.plugins['do'][name].replace(/%s/,arg);
    }
};

jQuery(function() {
    var doStatus = new PluginDoPageStatus();
});