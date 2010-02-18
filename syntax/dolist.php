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

        // parse the given match
        $match = substr($match, 9, -2);
        $url = explode('?', $match, 2);
        $ns = $url[0];
        $args = array();

        // check the arguments
        if (isset($url[1])) {
            parse_str($url[1],$args);

            // check for filters
            $filters = array_keys($args);
            foreach ($filters as $filter) {
                if (isset($args[$filter])) {
                    $args[$filter] = explode(',',$args[$filter]);
                    $c = count($args[$filter]);
                    for ($i = 0; $i<$c; $i++) {
                        $args[$filter][$i] = trim($args[$filter][$i]);
                    }
                }
            }
        }

        $data['args']       = $args;
        $data['args']['ns'] = $ns;

        return $data;
    }

    function render($mode, &$R, $data) {
        if($mode != 'xhtml') return false;
        $R->info['cache'] = false;
        global $ID;

        $this->setupLocale();

        $hlp = plugin_load('helper', 'do');
        $data = $hlp->loadTasks($data['args']);

        $R->doc .= '<table class="inline plugin_do">';
        $R->doc .= '<tr>';
        $R->doc .= '<th>'.$this->getLang('task').'</th>';
        $R->doc .= '<th>'.$this->getLang('user').'</th>';
        $R->doc .= '<th>'.$this->getLang('date').'</th>';
        $R->doc .= '<th>'.$this->getLang('status').'</th>';
        $R->doc .= '</tr>';

        foreach($data as $row){
            $R->doc .= '<tr>';
            $R->doc .= '<td>';
            $R->doc .= '<a href="'.wl($row['page']).'#plgdo__'.$row['md5'].'" class="wikilink1">'.hsc($row['text']).'</a>';
            $R->doc .= '</td>';

            $R->doc .= '<td>'.editorinfo($row['user']).'</td>';
            $R->doc .= '<td>'.hsc($row['date']).'</td>';
            $R->doc .= '<td align="center">';
            $R->doc .= '<a href="'.wl($ID,array('do'   => 'plugin_do',
                                                'do_page' => $row['page'],
                                                'do_md5'  => $row['md5']
                                                )).'" class="plugin_do_status">';
            if($row['status']){
                $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/status_done.png" title="'.sprintf($this->lang['js']['done'],$row['status']).'" />';
            }else{
                $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/status_open.png" title="'.$this->lang['js']['open'].'" />';
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
