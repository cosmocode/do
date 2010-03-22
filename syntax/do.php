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
    private $docstash;
    private $taskdata;
    private $run;
    private $status;

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
                //FIXME call $auth->cleanUser()
                $data['user'] = $match;
                break;

            case DOKU_LEXER_UNMATCHED:
                $data['match'] = $match;
                break;
        }

        return $data;
    }

    function render($mode, &$R, $data) {
        if($mode != 'xhtml') return false;
        global $ID;

        $hlp = plugin_load('helper', 'do');

        // on the first run for this page, clean up
        if(!isset($this->run[$ID])){
            $hlp->cleanPageTasks($ID);
            $this->run[$ID] = true;
        }
        if (!$this->status) {
            $this->status = array();
            $statuses = $hlp->loadPageStatuses($ID);
            foreach ($statuses as $state) {
                $this->status[$state['md5']] = $state;
            }
        }

        switch($data['state']){
            case DOKU_LEXER_ENTER:
                // move current document data to stack
                $this->docstash = $R->doc;
                $R->doc = '';

                // initialize data storage
                $this->taskdata = array(
                    'date' => $data['date'],
                    'user' => $data['user'],
                    'page' => $ID,
                );

                break;

            case DOKU_LEXER_UNMATCHED:
                // plain text, just print it
                $R->cdata($data['match']);
                break;

            case DOKU_LEXER_EXIT:
                global $ID;
                // determine the ID (ignore tags, case and whitespaces)
                $md5 = md5(utf8_strtolower(str_replace(' ','',strip_tags($R->doc))));
                $this->taskdata['md5']  = $md5;
                $this->taskdata['text'] = trim(strip_tags($R->doc));

                // put task markup into document
                $c = '';
                if ($this->status[$md5]) $c = 'c';

                if($this->taskdata['user'] && $this->taskdata['date']){
                    $text  = $this->getLang("title1$c");
                    $class = 'plugin_do1';
                }elseif($this->taskdata['user']){
                    $text = $this->getLang("title2$c");
                    $class = 'plugin_do2';
                }elseif($this->taskdata['date']){
                    $text = $this->getLang("title3$c");
                    $class = 'plugin_do3';
                }else{
                    $text = $this->getLang("title4$c");
                    $class = 'plugin_do4';
                }
                $param = array(
                    'do' => 'plugin_do',
                    'do_page' => $ID,
                    'do_md5' => $md5
                );

                $R->doc = '<a class="plugin_do_status plugin_do_single" href="'.wl($ID,$param).'"><span class="'.$class.'" id="plgdo__'.$md5.'" title="'.
                            sprintf($text,
                                    hsc($this->taskdata['user']),
                                    hsc($this->taskdata['date']),
                                    hsc($this->status[$md5]['closedby'])).'">'.
                                    $R->doc.'</span></a>';


                $meta = '';
                if ($this->taskdata['user'] || $this->taskdata['date']) {
                    $meta  = ' <span class="plugin_do_meta">(';
                    if ($this->taskdata['user']) {
                        $meta .= $this->getLang('user').' <span class="plugin_do_meta_user">'.hsc($this->taskdata['user']).'</span>';
                        if ($this->taskdata['date']) $meta .= ', ';
                    }
                    if ($this->taskdata['date']) {
                        $meta .= $this->getLang('date').' <span class="plugin_do_meta_date">'.hsc($this->taskdata['date']).'</span>';
                    }
                    $meta .=')</span>';
                }
                // restore the full document, including our additons
                $R->doc = $this->docstash.$R->doc.$meta;
                $this->docstash = '';

                // save the task data
                $hlp->saveTask($this->taskdata);

                // we're done with this task
                $this->taskdata = array();
                break;
        }

        return true;
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
