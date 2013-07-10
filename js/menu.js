

var DoPluginMenuButton = function(btn, edid) {
    this.menuButton = btn;
    this.editorId = edid;
    this.dialog = null;
    this.initialSelection = null;
    this.setup();
};

DoPluginMenuButton.prototype.setup = function() {
    var defaults = this.getAssigneeAndDateFromSelection();

    jQuery('body').append(
            '<div id="plugin__do__dialog" title="">' +
                '<fieldset>' +
                    '<p>' +
                        '<label for="plugin__do__dialog__assignee">' +
                            LANG.plugins['do']['popup_assign'] +
                        '</label>' +
                        '<input class="edit" id="plugin__do__dialog__assignee" type="text" value="' +
                            defaults.assignee +
                        '">' +
                    '</p>' +
                    '<p>' +
                        '<label for="plugin__do__dialog__date">' +
                            LANG.plugins['do']['popup_date'] +
                        '</label>' +
                        '<input class="edit" id="plugin__do__dialog__date" type="text" value="' +
                            defaults.date +
                        '">' +
                    '</p>' +
                '</fieldset>' +
            '</div>'
    );

    var that = this;
    jQuery('#plugin__do__dialog').dialog({
        autoOpen: true,
        buttons: [{
            text: LANG.plugins['do']['popup_submit'],
            click: function() { that.submitDialog(); }
        }],
        dialogClass: 'plugin_do_dialog',
        resizable: false,
        title: LANG.plugins['do']['toolbar_title'],
        close: this.closeDialog,
        width: 190
    });
};

DoPluginMenuButton.prototype.getAssigneeAndDateFromSelection = function() {
    var result = {
        "assignee": "",
        "date": ""
    };
    var selection = getSelection(jQuery('#' + this.editorId)[0]);
    this.initialSelection = selection;
    if (selection.getLength() != 0) {
        var text = selection.getText();
        var match = text.match(/<do ([^>]*)>[\s\S]*<\/do>/);
        if (match){
            var arguments = match[1];
            var dateMatch = arguments.match(/\d\d\d\d-\d\d-\d\d/);

            if (dateMatch){
                result.date = dateMatch[0];
                arguments = arguments.replace(result.date,'');
            }
            arguments = arguments.replace(/^\s+/,'');
            arguments = arguments.replace(/\s+$/,'');
            result.assignee = arguments;
        }
    }
    return result;
};

DoPluginMenuButton.prototype.submitDialog = function() {
    var assignee = jQuery("#plugin__do__dialog__assignee").val();
    var date = jQuery("#plugin__do__dialog__date").val();

    var pre = '<do';
    if (date && date.match(/^[0-9]{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])/)) {
        pre += ' ' + date;
    }
    if (assignee) {
        pre += ' ' + assignee;
    }
    pre +='>';

    var selection = getSelection(jQuery('#' + this.editorId)[0]);
    if(selection.start === 0 && selection.end === 0 && this.initialSelection != null) {
        selection = this.initialSelection;
    }

    var selectedText = selection.getText();

    //strip any previous do tags
    selectedText = selectedText.replace(/^<do[^>]*>([\s\S]*?)<\/do>$/, "$1");
    selectedText = pre + selectedText + '</do>';

    pasteText(selection,selectedText);
    jQuery('#plugin__do__dialog').dialog('close');
};

DoPluginMenuButton.prototype.closeDialog = function(event, ui) {
    jQuery('#plugin__do__dialog').remove();
};


/**
 * Add button action for the do button
 *
 * @param  btn   Button element to add the action to
 * @param  props Associative array of button properties
 * @param  edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function tb_do(btn, props, edid) {
    var dialog = new DoPluginMenuButton(btn, edid);
}

// add button to toolbar
if (window.toolbar != undefined) {
    window.toolbar[window.toolbar.length] = {
        "type":"do",
        "title": LANG.plugins['do'].toolbar_title,
        // icon from Yusuke Kamiyamane - http://www.pinvoke.com/
        "icon":DOKU_BASE + 'lib/plugins/do/pix/toolbar.png'
    };
}
