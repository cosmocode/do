<?php
/**
 * DokuWiki Plugin do (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 * @author  Adrian Lang <lang@cosmocode.de>
 * @author  Dominik Eckelmann <eckelmann@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();
require_once(DOKU_INC.'inc/JSON.php');


class action_plugin_do extends DokuWiki_Action_Plugin {

    /**
     * Register handlers for some event hooks
     *
     * @param Doku_Event_Handler $controller
     */
    function register(Doku_Event_Handler $controller) {

        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call');

        $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_act_preprocess');

        $controller->register_hook('IO_WIKIPAGE_WRITE', 'BEFORE', $this, 'handle_delete');

        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER',  $this, '_adduser');
    }

    /**
     * @param Doku_Event $event  event object by reference
     * @param null      $param  the parameters passed to register_hook when this handler was registered
     */
    function _adduser(&$event, $param) {
        if (!isset($_SERVER['REMOTE_USER'])) {
            return;
        }
        global $JSINFO;
        /** @var helper_plugin_do $hlp */
        $hlp = plugin_load('helper', 'do');
        $JSINFO['plugin_do_user'] = $_SERVER['REMOTE_USER'];
        $JSINFO['plugin_do_user_name'] = $hlp->getPrettyUser($_SERVER['REMOTE_USER']);
        $JSINFO['plugin_do_user_clean'] = html_entity_decode(strip_tags($JSINFO['plugin_do_user_name']));
    }

    /**
     * @param Doku_Event $event  event object by reference
     * @param null      $param  the parameters passed to register_hook when this handler was registered
     * @return bool
     */
    function handle_ajax_call(&$event, $param) {
        if($event->data == 'plugin_do'){
            // toggle status of a single task

            $event->preventDefault();
            $event->stopPropagation();

            $id = cleanID($_REQUEST['do_page']);

            if (auth_quickaclcheck($id) < AUTH_EDIT) {
                echo -1;
                return;
            }

            /** @var helper_plugin_do $hlp */
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->toggleTaskStatus($id, $_REQUEST['do_md5'], $_REQUEST['do_commit']);

            // rerender the page
            p_get_metadata($id, '', true);

            header('Content-Type: application/json; charset=utf-8');
            $JSON = new JSON();
            echo $JSON->encode($status);;

        }elseif($event->data == 'plugin_do_status'){
            // read status for a bunch of tasks

            $event->preventDefault();
            $event->stopPropagation();

            /** @var helper_plugin_do $hlp */
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->getAllPageStatuses(cleanID($_REQUEST['do_page']));

            header('Content-Type: application/json; charset=utf-8');
            $JSON = new JSON();
            echo $JSON->encode($status);
        }
    }

    /**
     * @param Doku_Event $event  event object by reference
     * @param null      $param  the parameters passed to register_hook when this handler was registered
     * @return bool
     */
    function handle_act_preprocess(&$event, $param) {

        if($event->data != 'plugin_do') return true;

        /** @var helper_plugin_do $hlp */
        $hlp = plugin_load('helper', 'do');
        $hlp->toggleTaskStatus(cleanID($_REQUEST['do_page']),$_REQUEST['do_md5']);

        global $ACT;
        $ACT = 'show';
        return true;
    }

    /**
     * @param Doku_Event $event  event object by reference
     * @param null      $param  the parameters passed to register_hook when this handler was registered
     */
    function handle_delete(&$event, $param){
        if (preg_match('/<do[^>]*>.*<\/do>/i',$event->data[0][1])) {
            // Only run if all tasks where removed from the page
            return;
        }

        if(isset($this->run[$event->data[2]])){
            // Only execute on the first run
            return;
        }

        /** @var helper_plugin_do $hlp */
        $hlp = plugin_load('helper', 'do');
        $hlp->cleanPageTasks($event->data[2]);
        $this->run[$event->data[2]] = true;
    }

}

