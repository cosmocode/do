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

        $args['ns'] = $ns;

        return $args;
    }

    function render($mode, &$R, $data) {
        if($mode != 'xhtml') return false;
        $R->info['cache'] = false;
        global $ID;

        $this->setupLocale();

        $userstyle    = isset($data['user']) ? ' style="display: none;"' : '';
        $creatorstyle = isset($data['creator']) ? ' style="display: none;"' : '';

        $hlp = plugin_load('helper', 'do');
        $data = $hlp->loadTasks($data);

        $R->doc .= '<table class="inline plugin_do">';
        $R->doc .= '    <tr>';
        $R->doc .= '    <th>'.$this->getLang('task').'</th>';
        $R->doc .= '    <th' . $userstyle . '>'.$this->getLang('user').'</th>';
        $R->doc .= '    <th>'.$this->getLang('date').'</th>';
        $R->doc .= '    <th>'.$this->getLang('status').'</th>';
        $R->doc .= '    <th' . $creatorstyle . '>'.$this->getLang('creator').'</th>';
        $R->doc .= '    <th>'.$this->lang['js']['popup_msg'].'</th>';
        $R->doc .= '  </tr>';

        if (count($data) === 0) {
            $R->tablerow_open();
            $R->tablecell_open(6, 'center');
            $R->cdata($this->getLang('none'));
            $R->tablecell_close();
            $R->tablerow_close();
            $R->doc .= '</table>';
            return true;
        }

        foreach($data as $row){
            $R->doc .= '<tr>';
            $R->doc .=   '<td class="plugin_do_page">';
            $R->doc .=     '<a title="' . $row['page'] .'" href="'.wl($row['page']).'#plgdo__'.$row['md5'].'" class="wikilink1">'.hsc($row['text']).'</a>';
            $R->doc .=   '</td>';
            $R->doc .=   '<td class="plugin_do_assigne"' . $userstyle . '>' . $hlp->getPrettyUser($row['user']) . '</td>';
            $R->doc .=   '<td class="plugin_do_date">'.hsc($row['date']).'</td>';
            $R->doc .=   '<td class="plugin_do_status" align="center">';

            // task status icon...
            list($class, $image, $title) = $data = $this->prepareTaskInfo($row['user'], $row['date'], $row['status'], $row['closedby']);
            $editor = ($row['closedby'])?$hlp->getPrettyUser($row['closedby']):'';

            $R->doc .= '<span class="plugin_do_' . ($row['status']?'done':'undone') . '">'; // outer span

            // img link
            $R->doc .= '<a href="'.wl($ID,array('do'=> 'plugin_do', 'do_page' => $row['page'], 'do_md5' => $row['md5']));
            if ($row['status'])
                $R->doc .= '" class="plugin_do_status plugin_do_adone">';
            else
                $R->doc .= '" class="plugin_do_status">';

            $R->doc .= '<img src="'.DOKU_BASE.'lib/plugins/do/pix/'.$image.'" class="plugin_do_img" title="'.$title.'" />';
            $R->doc .= '</a>';
            $R->doc .= '<span title="'.$title.'" class="'.$class.' plgdo__'.$row['md5'].'">'.$editor.'</span>';

            $R->doc .= '</span>'; // outer span end

            $R->doc .= '</td>';
            $R->doc .= '<td class="plugin_do_creator"' . $creatorstyle . '>';
            $R->doc .= $hlp->getPrettyUser($row['creator']);
            $R->doc .= '</td>';
            $R->doc .= '<td class="plugin_do_commit">';
            $R->doc .=  hsc($row['msg']);
            $R->doc .= '</td>';

            $R->doc .= '  </tr>';
        }

        $R->doc .= '</table>';

        return true;
    }


    function prepareTaskInfo($user, $date, $status, $closedBy) {
        $result = array();
        if($user && $date) {
            $result[] = 'plugin_do1';
        }elseif($user){
            $result[] = 'plugin_do2';
        }elseif($date){
            $result[] = 'plugin_do3';
        }else{
            $result[] = 'plugin_do4';
        }

        // change to "done" images
        $img = ($status) ? 'done.png' : 'undone.png';

        // setup title
        $title = '';

        if ($user) {
            $title .= $this->getJsText('assigne', $user);
        }

        if ($date) {
            $title .= $this->getJsText('due', $date);
        }

        if ($status) {
            $title .= $this->getJsText('done', $status);
        }

        if ($closedBy) {
           $title .= $this->getJsText('closedby', $closedBy);
        }

        $result[] = $img;
        $result[] = trim($title);

        return $result;
    }

    function getJsText($str, $arg) {
        return sprintf($this->lang['js'][$str], $arg) . ' ';
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
