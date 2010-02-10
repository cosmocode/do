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

class syntax_plugin_do_dolist extends DokuWiki_Syntax_Plugin {

    function getInfo() {
        return confToHash(dirname(__FILE__).'/../plugin.info.txt');
    }

    function getType() {
        return 'substition';
    }

    function getPType() {
        return 'block';
    }

    function getSort() {
        return 155;
    }


    function connectTo($mode) {
        $this->Lexer->addSpecialPattern('{{dolist>.*?}}',$mode,'plugin_do_dolist');
    }

    function handle($match, $state, $pos, &$handler){
        $data = array();

        return $data;
    }

    function render($mode, &$R, $data) {
        if($mode != 'xhtml') return false;
        $R->info['cache'] = false;
        global $ID;

        $hlp = plugin_load('helper', 'do');
        $data = $hlp->loadTasks();

        $R->doc .= '<table class="inline plugin_do">';
        $R->doc .= '<tr>';
        $R->doc .= '<th>'.$this->getLang('task').'</th>';
        $R->doc .= '<th>'.$this->getLang('user').'</th>';
        $R->doc .= '<th>'.$this->getLang('date').'</th>';
        $R->doc .= '<th>'.$this->getLang('status').'</th>';
        $R->doc .= '</tr>';

        foreach($data as $row){
            if($row['status']){
                $class = 'plugin_do_done';
            }else{
                $class = '';
            }

            $R->doc .= '<tr>';
            $R->doc .= '<td>';
            $R->doc .= '<a href="'.wl($row['page']).'#plgdo__'.$row['md5'].'" class="wikilink1 '.$class.'">'.hsc($row['text']).'</a>';
            $R->doc .= '</td>';

            $R->doc .= '<td>'.editorinfo($row['user']).'</td>';
            $R->doc .= '<td>'.hsc($row['date']).'</td>';
            $R->doc .= '<td align="center">';
            $R->doc .= '<a href="'.wl($ID,array('do'   => 'plugin_do',
                                                'do_page' => $row['page'],
                                                'do_md5'  => $row['md5']
                                                )).'">';
            if($row['status']){
                $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/status_done.png" title="FIXME" />';
            }else{
                $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/status_open.png" title="FIXME" />';
            }
            $R->doc .= '</a>';
            $R->doc .= '</td>';
            $R->doc .= '</tr>';
        }

        $R->doc .= '</table>';

        return true;
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
