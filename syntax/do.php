<?php
/**
 * DokuWiki Plugin do (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

if (!defined('DOKU_LF')) define('DOKU_LF', "\n");
if (!defined('DOKU_TAB')) define('DOKU_TAB', "\t");
if (!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

require_once(DOKU_PLUGIN.'syntax.php');

class syntax_plugin_do_do extends DokuWiki_Syntax_Plugin {
    private $run;
    private $status;
    private $oldStatus;
    private $position = 0;
    private $saved = array();

    function getType() {
        return 'formatting';
    }

    function getPType() {
        return 'normal';
    }

    function getSort() {
        return 155;
    }

    function getAllowedTypes() {
        return array('formatting');
    }

    function connectTo($mode) {
       $this->Lexer->addEntryPattern('<do.*?>(?=.*?</do>)',$mode,'plugin_do_do');
    }

    function postConnect() {
        $this->Lexer->addExitPattern('</do>','plugin_do_do');
    }

    function handle($match, $state, $pos, &$handler){
        $data = array();
        $data['state'] = $state;
        switch($state){
            case DOKU_LEXER_ENTER:
                $match = trim(substr($match,3,-1));

                if(preg_match('/\b(\d\d\d\d-\d\d-\d\d)\b/',$match,$grep)){
                    $data['date'] = $grep[1];
                    $match = trim(str_replace($data['date'],'',$match));
                }

                if ($match !== '') {
                    //FIXME call $auth->cleanUser()
                    $data['user'] = $match;
                }

                $ReWriter = new Doku_Handler_Nest($handler->CallWriter,'plugin_do_do');
                $handler->CallWriter = & $ReWriter;
                $handler->addPluginCall('do_do', $data, $state, $pos, $match);
                break;

            case DOKU_LEXER_UNMATCHED:
                $handler->_addCall('cdata', array($match), $pos);
                break;

            case DOKU_LEXER_EXIT:
                global $ID;
                $data['text'] = trim(strip_tags(p_render('xhtml', array_slice($handler->CallWriter->calls, 1), $ignoreme)));
                $data['md5'] = md5(utf8_strtolower(preg_replace('/\s/','', $data['text'])) . $ID);

                // Add missing data from ENTER and EXIT to the other
                $handler->CallWriter->calls[0][1][1] += $data;
                $data += $handler->CallWriter->calls[0][1][1];

                $handler->addPluginCall('do_do', $data, $state, $pos, $match);
                $handler->CallWriter->process();
                $ReWriter = & $handler->CallWriter;
                $handler->CallWriter = & $ReWriter->CallWriter;
        }
        return false;
    }

    function render($mode, &$R, $data) {
        global $ID;
        $data['page'] = $ID;

        // get the helper
        $hlp = plugin_load('helper', 'do');

        // hold old status. we need this to keep creator stuff
        if (!$this->oldStatus) {
            $this->oldStatus = array();
            $statuses = $hlp->getAllPageStatuses($ID);
            foreach ($statuses as $state) {
                $this->oldStatus[$state['md5']] = $state;
            }
        }
        if (isset($this->oldStatus[$data['md5']])) {
            $data['creator'] = $this->oldStatus[$data['md5']]['creator'];
            $data['msg'] = $this->oldStatus[$data['md5']]['msg'];
        }

        if ($mode === 'metadata') {
            $this->_save($data, $hlp);
            return true;
        }

        // get the page status if not present
        if (!$this->status) {
            $this->status = array();
            $statuses = $hlp->loadPageStatuses($ID);
            foreach ($statuses as $state) {
                $this->status[$state['md5']] = $state;
            }
        }

        if ($mode != 'xhtml') {
            $R->info['cache'] = false;
            switch($data['state']){
            case DOKU_LEXER_ENTER:
                $this->task = $hlp->loadTasks(array('md5' => $data['md5']));
                $R->externalmedia(DOKU_URL . 'lib/plugins/do/pix/' .
                                  ($this->task[0]['status'] ? '' : 'un') . 'done.png');
                break;

            case DOKU_LEXER_EXIT:
                if ($this->task[0]['msg']) {
                    $R->cdata(' (' . $this->task[0]['msg'] . ')');
                }
            }
            return true;
        }

        switch($data['state']){
            case DOKU_LEXER_ENTER:
                $param = array(
                    'do' => 'plugin_do',
                    'do_page' => $ID,
                    'do_md5' => $data['md5']
                );
                $R->doc .= '<span class="plugin_do_item plugin_do_'.$data['md5'].'">'
                        .  '<a class="plugin_do_status" href="'.wl($ID,$param).'">'
                        .  ' <img src="'.DOKU_BASE.'lib/plugins/do/pix/undone.png" />'
                        .  '</a><span class="plugin_do_task">';

                break;

            case DOKU_LEXER_EXIT:

                $R->doc .= '</span><span class="plugin_do_commit">'
                        .  (empty($data['msg'])?'':'(' . $this->lang['js']['note_done'] . hsc($data['msg']) .')')
                        .  '</span>';

                if (isset($data['user']) || isset($data['date'])) {
                    $R->doc .= ' <span class="plugin_do_meta">(';
                    if (isset($data['user'])) {
                        $R->doc .= $this->getLang('user').' <span class="plugin_do_meta_user">'.$hlp->getPrettyUser($data['user']).'</span>';
                        if (isset($data['date'])) $R->doc .= ', ';
                    }
                    if (isset($data['date'])) {
                        $R->doc .= $this->getLang('date').' <span class="plugin_do_meta_date">'.hsc($data['date']).'</span>';
                    }
                    $R->doc .=')</span>';
                }
                $R->doc .= '</span>';
                break;
        }

        return true;
    }

    function _save($data, $hlp) {
        global $ID;

        // on the first run for this page, clean up
        if(!isset($this->run[$ID])){
            $hlp->cleanPageTasks($ID);
            $this->run[$ID] = true;
        }

        // get the page status if not present
        if (!$this->status) {
            $this->status = array();
            $statuses = $hlp->loadPageStatuses($ID);
            foreach ($statuses as $state) {
                $this->status[$state['md5']] = $state;
            }
        }

        if ($data['state'] !== DOKU_LEXER_EXIT) {
            return;
        }

        // save the task data - only when not saved yet.
        if (in_array($data['md5'], $this->saved)) {
            return;
        }

        $data['pos'] = ++$this->position;

        $hlp->saveTask($data);
        $this->saved[] = $data['md5'];
    }
}

// vim:ts=4:sw=4:et:enc=utf-8
