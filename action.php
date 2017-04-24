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
if(!defined('DOKU_INC')) die();
require_once(DOKU_INC . 'inc/JSON.php');

class action_plugin_do extends DokuWiki_Action_Plugin {

    /**
     * Register handlers for some event hooks
     *
     * @param Doku_Event_Handler $controller
     */
    public function register(Doku_Event_Handler $controller) {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call');
        $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_act_preprocess');
        $controller->register_hook('IO_WIKIPAGE_WRITE', 'BEFORE', $this, 'handle_delete');
        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER', $this, '_adduser');
    }

    /**
     * @param Doku_Event $event event object by reference
     * @param null       $param the parameters passed to register_hook when this handler was registered
     */
    public function _adduser(&$event, $param) {
        if(!isset($_SERVER['REMOTE_USER'])) {
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
     * @param Doku_Event $event event object by reference
     * @param null       $param the parameters passed to register_hook when this handler was registered
     * @return bool
     */
    public function handle_ajax_call(&$event, $param) {
        if($event->data == 'plugin_do') { // FIXME: refactor this into early return and switch
            // toggle status of a single task
            global $INPUT;

            $event->preventDefault();
            $event->stopPropagation();

            $id = cleanID($_REQUEST['do_page']);

            if(auth_quickaclcheck($id) < AUTH_EDIT) {
                if($INPUT->server->has('REMOTE_USER')) {
                    echo -2; //not allowed
                } else {
                    echo -1; //not logged in
                }
                return;
            }

            /** @var helper_plugin_do $hlp */
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->toggleTaskStatus($id, $_REQUEST['do_md5'], $_REQUEST['do_commit']);

            // rerender the page
            p_get_metadata($id, '', true);

            header('Content-Type: application/json; charset=utf-8');
            $JSON = new JSON();
            echo $JSON->encode($status);

        } elseif($event->data == 'plugin_do_status') {
            // read status for a bunch of tasks

            $event->preventDefault();
            $event->stopPropagation();

            $page = cleanID($_REQUEST['do_page']);

            if(auth_quickaclcheck($page) < AUTH_READ) {
                $status = array();
            } else {
                /** @var helper_plugin_do $hlp */
                $hlp = plugin_load('helper', 'do');
                $status = $hlp->getAllPageStatuses($page);
            }

            header('Content-Type: application/json; charset=utf-8');
            $JSON = new JSON();
            echo $JSON->encode($status);
        } elseif ($event->data === 'plugin_do_userTasksOverlay') {
            $event->preventDefault();
            $event->stopPropagation();

            global $INPUT;

            if (!$INPUT->server->has('REMOTE_USER')) {
                http_status(401, 'login required');
                return false;
            }

            $user = $INPUT->server->str('REMOTE_USER');

            /** @var helper_plugin_do $hlp */
            $hlp = plugin_load('helper', 'do');
            $tasks = $hlp->loadTasks(array('status' => array('undone'),'user' => $user));
            /** @var syntax_plugin_do_dolist $syntax */
            $syntax = plugin_load('syntax', 'do_dolist');
            $html = $syntax->buildTasklistHTML($tasks, true, false);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(array('html' => $html));
        }
    }

    /**
     * @param Doku_Event $event event object by reference
     * @param null       $param the parameters passed to register_hook when this handler was registered
     * @return bool
     */
    public function handle_act_preprocess(&$event, $param) {

        if($event->data != 'plugin_do') return true;
        global $INPUT;

        $pageid = cleanID($_REQUEST['do_page']);
        $status = '';
        if(auth_quickaclcheck($pageid) < AUTH_EDIT) {
            $lvl = -1;
            $key = 'notloggedin';
            if($INPUT->server->has('REMOTE_USER')) {
                $key = 'notallowed';
            }
        } else {
            /** @var helper_plugin_do $hlp */
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->toggleTaskStatus($pageid, $_REQUEST['do_md5']);
            if($status == -2) {
                $lvl = -1;
                $key = 'notallowed';
            } else {
                $lvl = 1;
                if($status) {
                    $key = 'done';
                } else {
                    $key = 'open';
                }
            }

        }

        $jslang = $this->getLang('js');
        msg(sprintf($jslang[$key], $status), $lvl);

        global $ACT;
        $ACT = 'show';
        return true;
    }

    /**
     * @param Doku_Event $event event object by reference
     * @param null       $param the parameters passed to register_hook when this handler was registered
     */
    public function handle_delete(&$event, $param) {
        if(preg_match('/<do[^>]*>.*<\/do>/i', $event->data[0][1])) {
            // Only run if all tasks where removed from the page
            return;
        }

        if(isset($this->run[$event->data[2]])) {
            // Only execute on the first run
            return;
        }

        /** @var helper_plugin_do $hlp */
        $hlp = plugin_load('helper', 'do');
        $hlp->cleanPageTasks($event->data[2]);
        $this->run[$event->data[2]] = true;
    }

}

