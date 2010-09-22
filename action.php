<?php
/**
 * DokuWiki Plugin do (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

if (!defined('DOKU_LF')) define('DOKU_LF', "\n");
if (!defined('DOKU_TAB')) define('DOKU_TAB', "\t");
if (!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

require_once(DOKU_PLUGIN.'action.php');

class action_plugin_do extends DokuWiki_Action_Plugin {

    function register(&$controller) {

        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call');

        $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_act_preprocess');

        $controller->register_hook('IO_WIKIPAGE_WRITE', 'BEFORE', $this, 'handle_delete');

        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER',  $this, '_adduser');
    }

    function _adduser(&$event, $param) {
        if (!isset($_SERVER['REMOTE_USER'])) {
            return;
        }
        global $JSINFO;
        $hlp = plugin_load('helper', 'do');
        $JSINFO['plugin_do_user'] = $_SERVER['REMOTE_USER'];
        $JSINFO['plugin_do_user_name'] = $hlp->getPrettyUser($_SERVER['REMOTE_USER']);
        $JSINFO['plugin_do_user_clean'] = html_entity_decode(strip_tags($JSINFO['plugin_do_user_name']));
    }

    function handle_ajax_call(&$event, $param) {
        if($event->data == 'plugin_do'){

            $id = cleanID($_REQUEST['do_page']);

            if (auth_quickaclcheck($id) < AUTH_EDIT) {
                echo -1;
                $event->preventDefault();
                $event->stopPropagation();
                return false;
            }
            // toggle status of a single task
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->toggleTaskStatus($id, $_REQUEST['do_md5'], $_REQUEST['do_commit']);

            // rerender the page
            p_get_metadata(cleanID($_REQUEST['do_page']),'',true);

            header('Content-Type: text/plain; charset=utf-8');
            echo $status;

            $event->preventDefault();
            $event->stopPropagation();
            return false;
        }elseif($event->data == 'plugin_do_status'){
            // read status for a bunch of tasks
            require_once(DOKU_INC.'inc/JSON.php');

            $JSON = new JSON();
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->getAllPageStatuses(cleanID($_REQUEST['do_page']));
            $status = $JSON->encode($status);

            header('Content-Type: text/plain; charset=utf-8');
            echo $status;

            $event->preventDefault();
            $event->stopPropagation();
            return false;
        }
        return true;
    }


    function handle_act_preprocess(&$event, $param) {

        if($event->data != 'plugin_do') return true;

        $hlp = plugin_load('helper', 'do');
        $hlp->toggleTaskStatus(cleanID($_REQUEST['do_page']),$_REQUEST['do_md5']);

        global $ACT;
        $ACT = 'show';
        return true;
    }

    function handle_delete(&$event, $param){
        if (preg_match('/<do[^>]*>.*<\/do>/i',$event->data[0][1]) === 1) {
            // Only run if syntax plugin did not
            return;
        }

        global $ID;

        if(isset($this->run[$ID])){
            // Only execute on the first run
            return;
        }

        $hlp = plugin_load('helper', 'do');
        $hlp->cleanPageTasks($ID);
        $this->run[$ID] = true;
    }

}

// vim:ts=4:sw=4:et:enc=utf-8:
