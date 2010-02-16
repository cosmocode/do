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

    function getInfo() {
        return confToHash(dirname(__FILE__).'/plugin.info.txt');
    }

    function register(&$controller) {

       $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call');

       $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_act_preprocess');

       $controller->register_hook('IO_WIKIPAGE_WRITE', 'BEFORE', $this, 'handle_delete');
    }

    function handle_ajax_call(&$event, $param) {
        if($event->data == 'plugin_do'){
            // toggle status of a single task
            $hlp = plugin_load('helper', 'do');
            $status = $hlp->toggleTaskStatus(cleanID($_REQUEST['do_page']),$_REQUEST['do_md5']);

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
            $status = $hlp->loadPageStatuses(cleanID($_REQUEST['do_page']));
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
        $data = $event->data;
        
        if(!empty($data[0][1])) return;

        global $ID;
        $hlp = plugin_load('helper', 'do');

        // on the first run for this page, clean up
        if(!isset($this->run[$ID])){
            $hlp->cleanPageTasks($ID);
            $this->run[$ID] = true;
        }

    }

}

// vim:ts=4:sw=4:et:enc=utf-8:
