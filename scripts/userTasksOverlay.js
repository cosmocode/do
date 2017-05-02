// eslint-disable-next-line func-names
jQuery(function () {
    'use strict';

    var $userTasksButtons = jQuery('button.plugin__do_usertasks');
    $userTasksButtons.click(function handleUserTasksButtonClick(event) {
        var $this;
        event.stopPropagation();
        event.preventDefault();

        if (jQuery('.plugin__do_usertasks_list').length) {
            jQuery('.plugin__do_usertasks_list').toggle();
            return;
        }

        $this = jQuery(this);

        jQuery.get(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'plugin_do_userTasksOverlay',
            }
        ).done(function showUserTasksOverlay(data) {
            var $wrapper = jQuery('<div class="plugin__do_usertasks_list"></div>');
            $wrapper.css({ display: 'inline-block', position: 'absolute' });
            $wrapper.append(jQuery(data));
            $wrapper.appendTo('.dokuwiki');
            $wrapper.position({
                my: 'middle top',
                at: 'right bottom',
                of: $this,
            });
        });
    });
});
