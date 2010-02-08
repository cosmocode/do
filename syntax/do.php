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

    function getInfo() {
        return confToHash(dirname(__FILE__).'/../plugin.info.txt');
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
                // determine the ID (ignore tags, case and whitespaces)
                $md5 = md5(utf8_strtolower(str_replace(' ','',strip_tags($R->doc))));
                $this->taskdata['id'] = $md5;

                // put task markup into document
                if($this->taskdata['user'] && $this->taskdata['date']){
                    $text  = $this->getLang('title1');
                    $class = 'plugin_do1';
                }elseif($this->taskdata['user']){
                    $text = $this->getLang('title2');
                    $class = 'plugin_do2';
                }elseif($this->taskdata['date']){
                    $text = $this->getLang('title3');
                    $class = 'plugin_do3';
                }else{
                    $text = $this->getLang('title4');
                    $class = 'plugin_do4';
                }

                $R->doc = '<span class="'.$class.'" id="plgdo__'.$md5.'" title="'.
                            sprintf($text,
                                    hsc($this->taskdata['user']),
                                    hsc($this->taskdata['date'])).'">'.
                          $R->doc.'</span>';

                // restore the full document, including our additons
                $R->doc = $this->docstash.$R->doc;
                $this->docstash = '';

                break;
        }

        return true;
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
