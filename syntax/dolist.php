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

        // usability enhance
        //
        // if there is no ? but a & the user has probably forgot the ? befor the first arg.
        // in this case we'll replace the first & to a ?
        if (!strpos($match,'?')) {
            $pos = strpos($match,'&');
            if (is_int($pos)) {
                $match[$pos] = '?';
            }
        }

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
        $R->doc .= '<th>'.$this->getLang('creator').'</th>';
        $R->doc .= '</tr>';

        foreach($data as $row){
            $R->doc .= '<tr>';
            $R->doc .= '<td>';
            $R->doc .= '<a title="' . $row['page'] . '" href="'.wl($row['page']).'#plgdo__'.$row['md5'].'" class="wikilink1">'.hsc($row['text']).'</a>';
            $R->doc .= '</td>';
            $R->doc .= '<td>' . $hlp->getPrettyUser($row['user']) . '</td>';
            $R->doc .= '<td>'.hsc($row['date']).'</td>';
            $R->doc .= '<td align="center">';

            $c = '';
            $img = '';
            if (!empty($row['status'])) $c = 'c';
            if($row['user'] && $row['date']){
                $text  = $this->getLang("title1$c");
                $class = 'plugin_do1';
                if ($row['status']) $img = '7';
                else $img = 3;
            }elseif($row['user']){
                $text = $this->getLang("title2$c");
                $class = 'plugin_do2';
                if ($row['status']) $img = '1';
                else $img = 6;
            }elseif($row['date']){
                $text = $this->getLang("title3$c");
                $class = 'plugin_do3';
                if ($row['status']) $img = '8';
                else $img = 4;
            }else{
                $text = $this->getLang("title4$c");
                $class = 'plugin_do4';
                if ($row['status']) $img = '2';
                else $img = 5;
            }
            $text = sprintf($text, hsc($row['user']), hsc($row['date']), hsc($row['closedby']));

            $R->doc .= '<span class="plugin_do_' . ($row['status']?'done':'undone') . '">'; // outer span

            // text span
            $editor = editorinfo($row['closedby']);
            if (empty($editor)) $editor = '&nbsp;';
            $R->doc .= '<span title="'.$text.'" class="'.$class.'">'.$editor.'</span>';


            // img link
            $R->doc .= '<a href="'.wl($ID,array('do'=> 'plugin_do', 'do_page' => $row['page'], 'do_md5' => $row['md5']));
            if ($row['status']) $R->doc .= '" class="plugin_do_status plugin_do_adone">';
            else $R->doc .= '" class="plugin_do_status">';
            $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/do'.$img.'.png" class="plugin_do_img" title="'.$text.'" />';
            $R->doc .= '</a>';

            $R->doc .= '</span>'; // outer span end

            $R->doc .= '</td>';
            $R->doc .= '<td class="plugin_do_creator">';
            $R->doc .= hsc($row['creator']);
            $R->doc .= '</td>';
            $R->doc .= '</tr>';
        }

        $R->doc .= '</table>';

        return true;
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
