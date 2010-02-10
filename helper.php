<?php
/**
 * DokuWiki Plugin do (Helper Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) die();

if (!defined('DOKU_LF')) define('DOKU_LF', "\n");
if (!defined('DOKU_TAB')) define('DOKU_TAB', "\t");
if (!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

class helper_plugin_do extends DokuWiki_Plugin {

    private $db = null;

    function getInfo() {
        return confToHash(dirname(__FILE__).'plugin.info.txt');
    }

    /**
     * Constructor. Initializes the SQLite DB Connection
     */
    function helper_plugin_do() {
        $this->db = plugin_load('helper', 'sqlite');
        if(!$this->db){
            msg('The do plugin requires the sqlite plugin. Please install it');
        }else{
            if(!$this->db->init('do',dirname(__FILE__).'/db/')){
                $this->db = null;
            }
        }
    }


    function cleanPageTasks($id){
        if(!$this->db) return;
        $this->db->query('DELETE FROM tasks WHERE page = ?',$id);
    }

    function saveTask($data){
        if(!$this->db) return;

        $this->db->query('INSERT INTO tasks (page,md5,date,user,text)
                               VALUES (?, ?, ?, ?, ?)',
                         $data['page'],
                         $data['md5'],
                         $data['date'],
                         $data['user'],
                         $data['text']);
    }

    function loadTasks(){
        if(!$this->db) return array();

        $res = $this->db->query('SELECT A.page   AS page,
                                        A.md5    AS md5,
                                        A.date   AS date,
                                        A.user   AS user,
                                        A.text   AS text,
                                        B.status AS status
                                   FROM tasks A LEFT JOIN task_status B
                                     ON A.page = B.page
                                    AND A.md5 = B.md5
                               ORDER BY B.status, A.date, A.text');
        return $this->db->res2arr($res);
    }

    function toggleTaskStatus($page,$md5){
        if(!$this->db) return array();
        $md5 = trim($md5);
        if(!$page || !$md5) return;

        $res = $this->db->query('SELECT status
                                   FROM task_status
                                  WHERE page = ?
                                    AND md5  = ?',
                                $page, $md5);
        $stat = $this->db->res2row($res);
        $stat = $stat['status'];

        if(!$stat){
            $this->db->query('INSERT INTO task_status
                                    (page, md5, status)
                                    VALUES (?, ?, ?)',
                                    $page, $md5, date('Y-m-d',time()));
        }else{
            $this->db->query('DELETE FROM task_status
                               WHERE page = ?
                                    AND md5  = ?',
                                $page, $md5);
        }
    }

}

// vim:ts=4:sw=4:et:enc=utf-8:
