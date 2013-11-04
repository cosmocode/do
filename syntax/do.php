<?php
/**
 * DokuWiki Plugin do (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 * @author Adrian Lang <lang@cosmocode.de>
 * @author Dominik Eckelmann <eckelmann@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

class syntax_plugin_do_do extends DokuWiki_Syntax_Plugin {
    /** @var helper_plugin_do */
    private $hlp = null;         // helper plugin
    private $position = 0;

    private $run      = array(); // page run cache
    private $saved    = array(); // save state cache
    private $ids      = array();

    function syntax_plugin_do_do(){
        $this->hlp = plugin_load('helper', 'do');
    }

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
        global $auth;

        $data = array('task'  => array(),
                      'state' => $state);
        switch($state){
            case DOKU_LEXER_ENTER:
                $content = trim(substr($match,3,-1));

                // get the assignment date
                if(preg_match('/\b(\d\d\d\d-\d\d-\d\d)\b/', $content, $grep)){
                    $data['task']['date'] = $grep[1];
                    $content = trim(str_replace($data['task']['date'],'',$content));
                }

                // get the assigned users
                if ($content !== '') {
                    $data['task']['users'] = explode(',',$content);
                    $data['task']['users'] = array_map('trim',$data['task']['users']);
                    if($auth){
                        $data['task']['users'] = array_map(array($auth,'cleanUser'),$data['task']['users']);
                    }
                    $data['task']['users'] = array_unique($data['task']['users']);
                    $data['task']['users'] = array_filter($data['task']['users']);
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
                $data['task']['text'] = $this->_textContent(p_render('xhtml',
                                                                     array_slice($handler->CallWriter->calls, 1),
                                                                     $ignoreme));
                $data['task']['md5'] = md5(utf8_strtolower(preg_replace('/\s/', '', $data['task']['text'])) . $ID);

                // Add missing data from ENTER and EXIT to the other
                $handler->CallWriter->calls[0][1][1]['task'] += $data['task'];
                $data['task'] += $handler->CallWriter->calls[0][1][1]['task'];

                $handler->addPluginCall('do_do', $data, $state, $pos, $match);
                $handler->CallWriter->process();
                $ReWriter = & $handler->CallWriter;
                $handler->CallWriter = & $ReWriter->CallWriter;
        }
        return false;
    }

    /**
     * Return the plain-text content of an html blob, similar to
     * node.textContent, but trimmed
     */
    function _textContent($text) {
        return trim(html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8'));
    }

    /**
     * Return the task as it was before this rendering run
     *
     * @param    string $page - the current page
     * @param    string $md5  - the task identifier
     * @return  array        - the task data (empty for new tasks)
     */
    function _oldTask($page,$md5){
        static $oldTasks = null; // old task cache
        static $curPage  = null; // what page are we working on?

        // reinit the cache whenever the page changes
        if($curPage != $page){
            $curPage  = $page;
            $oldTasks = array();
            $statuses = $this->hlp->loadTasks(array('id' => $page));
            foreach ($statuses as $state) {
                $oldTasks[$state['md5']] = $state;
            }
        }
        return (array) $oldTasks[$md5];
    }

    /**
     * Decide if a task needs to be saved.
     *
     * Returns true on the first call, false on subsequent calls
     * for a given task
     */
    function _needsSave($page,$md5){
        if(isset($this->saved[$page][$md5])){
            return false;
        }
        $this->saved[$page][$md5] = 1;
        return true;
    }


    function render($mode, &$R, $data) {
        global $ID;

        // we don't care for QC FIXME we probably should ignore even more renderers
        if($mode == 'qc') return false;

        // augment current task with original creator info and old assignees
        $oldtask = $this->_oldTask($ID,$data['task']['md5']);
        if($oldtask){
            $data['task']['creator'] = $oldtask['creator'];
            $data['task']['msg']     = $oldtask['msg'];
            $data['task']['status']  = $oldtask['status'];
        }

        // save data to sqlite during meta data run
        if ($mode === 'metadata') {
            $this->_save($data);
            return true;
        }

        // show simple task with status icon for export renderers
        if ($mode != 'xhtml') {
            $R->info['cache'] = false;
            switch($data['state']){
            case DOKU_LEXER_ENTER:
                $pre = ($oldtask && $oldtask['status']) ? '' : 'un';
                $R->externalmedia(DOKU_URL . "lib/plugins/do/pix/${pre}done.png");
                break;

            case DOKU_LEXER_EXIT:
                if ($data['task']['msg']) {
                    $R->cdata(' (' . $data['task']['msg'] . ')');
                }
            }
            return true;
        }

        // handle XHTML output with status management
        switch($data['state']){
            case DOKU_LEXER_ENTER:
                $param = array(
                    'do' => 'plugin_do',
                    'do_page' => $ID,
                    'do_md5' => $data['task']['md5']
                );
                $id = '';
                if (!in_array($data['task']['md5'], $this->ids)) {
                    $id = 'id="plgdo__' . $data['task']['md5'] . '" ';
                    $this->ids[] = $data['task']['md5'];
                }
                $R->doc .= '<span ' . $id . 'class="plugin_do_item plugin_do_'.$data['task']['md5'].'">'
                        .  '<a class="plugin_do_status" href="'.wl($ID,$param).'">'
                        .  ' <img src="'.DOKU_BASE.'lib/plugins/do/pix/undone.png" />'
                        .  '</a><span class="plugin_do_task">';

                break;

            case DOKU_LEXER_EXIT:

                $R->doc .= '</span><span class="plugin_do_commit">'
                        .  (empty($data['task']['msg'])?'':'(' . $this->lang['js']['note_done'] . hsc($data['task']['msg']) .')')
                        .  '</span>';

                if (isset($data['task']['users']) || isset($data['task']['date'])) {
                    $R->doc .= ' <span class="plugin_do_meta">(';
                    if (isset($data['task']['users'])) {
                        $R->doc .= $this->getLang('user');

                        $users     = $data['task']['users'];
                        $userCount = count($users);
                        for ($i=0; $i<$userCount; $i++) {
                            $R->doc .= ' <span class="plugin_do_meta_user">'.$this->hlp->getPrettyUser($users[$i]).'</span>';
                            if ($i <$userCount-1) $R->doc .= ', ';
                        }
                        if (isset($data['task']['date'])) $R->doc .= '. ';
                    }
                    if (isset($data['task']['date'])) {
                        $R->doc .= $this->getLang('date').' <span class="plugin_do_meta_date">'.hsc($data['task']['date']).'</span>';
                    }
                    $R->doc .=')</span>';
                }
                $R->doc .= '</span>';
                break;
        }

        return true;
    }

    function _save($data) {
        global $ID;
        global $auth;

        // on the first run for this page, clean up
        if(!isset($this->run[$ID])){
            $this->hlp->cleanPageTasks($ID);
            $this->run[$ID] = true;
        }

        // we save at the end of our instructions
        if ($data['state'] !== DOKU_LEXER_EXIT) return;

        // did we save already?
        if(!$this->_needsSave($ID,$data['task']['md5'])) return;

        // make sure data is complete
        if (!isset($data['task']['creator'])) {
            $data['task']['creator'] = $_SERVER['REMOTE_USER'];
        }
        $data['task']['page'] = $ID;
        $data['task']['pos']  = ++$this->position;

        // save it
        $this->hlp->saveTask($data['task']);

        // now decide if we should mail anyone
        if(!$auth) return;
        if(!isset($data['task']['users'])) return;
        if(!$this->getConf('notify_assignee')) return;

        // don't mail current or original editor or old assignees
        $oldtask = $this->_oldTask($ID,$data['task']['md5']);
        $receivers = array_diff(
                        $data['task']['users'],
                        (array) $oldtask['users'],
                        array($_SERVER['REMOTE_USER'],$data['task']['creator']));

        // now mail any new assignees if task is still open
        if(!$data['task']['status']){
            $this->hlp->sendMail($receivers,'open',$data['task'],$data['task']['creator']);
        }
    }
}

