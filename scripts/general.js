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

