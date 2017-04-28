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
    'use strict';

    PluginDo.initDialog(edid);

    // add toolbar button action
    $btn.click(PluginDo.toggleToolbarDialog);

    return 'do';
}

/**
 * Append button to toolbar
 */
if (typeof window.toolbar !== 'undefined') {
    // icon from Yusuke Kamiyamane - http://www.pinvoke.com/
    window.toolbar.push({
        type: 'do',
        title: LANG.plugins.do.toolbar_title,
        icon: '../../plugins/do/pix/toolbar.png',
    });
}
