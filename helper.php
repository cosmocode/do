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

    /**
     * Constructor. Initializes the SQLite DB Connection
     */
    function helper_plugin_do() {
        $this->db = plugin_load('helper', 'sqlite');
        if(!$this->db){
            msg('The do plugin requires the sqlite plugin. Please install it');
            return;
        }
        if(!$this->db->init('do',dirname(__FILE__).'/db/')){
            $this->db = null;
        }
    }

    /**
     * Delete the all tasks from a given page id
     */
    function cleanPageTasks($id){
        if(!$this->db) return;
        $this->db->query('DELETE FROM tasks WHERE page = ?',$id);
    }

    /**
     * save a task.
     *
     * @param array  data       task informations as key value array.
     *                          keys are: page, md5, date, user, text, creator, msg
     *
     * @param string creator    if the task is has already a knowen creator you can
     *                          set it here. if it's not set it'll be the current user.
     */
    function saveTask($data, $creator = ''){
        if(!$this->db) return;

        if (!empty($creator)) {
            $data['creator'] = $creator;
        } else {
            $data['creator'] = $_SERVER['REMOTE_USER'];
        }
        $this->db->query(
            'INSERT INTO tasks (page,md5,date,user,text,creator,msg,pos)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
             $data['page'],
             $data['md5'],
             $data['date'],
             $data['user'],
             strip_tags($data['text']),
             $data['creator'],
             strip_tags($data['msg']),
             $data['pos']
        );
    }

    /**
     * Load all tasks with given filters.
     *
     * Filters are:
     *  - ns        for namespace filters
     *  - id
     *  - status    can be done or undone to filter for (un)completed tasks
     *  - limit     limit the results to a given number of results
     *  - user      all tasks to a given user
     *
     * @param array $args filters to apply
     * @return filtered result.
     */
    function loadTasks($args = null){
        if(!$this->db) return array();
        $where = '';
        $limit = '';
        if (isset($args))
        {
            $where .= ' WHERE 1';

            if (isset($args['ns'])) {
                global $ID;
                $exists = false;
                resolve_pageid(getNS($ID), $args['ns'], $exists);
                $args['ns'] = getNS($args['ns']);
                $where .= sprintf(' AND A.page LIKE %s',$this->db->quote_string($args['ns'].'%'));
            }

            if (isset($args['id'])) {
                global $ID;
                $exists = false;
                resolve_pageid(getNS($ID), $args['id'], $exists);
                $where .= sprintf(' AND A.page = %s',$this->db->quote_string($args['id']));
            }

            if (isset($args['status']))
            {
                if ($args['status'][0] == 'done')
                {
                    $where .= ' AND B.status IS NOT null';
                } elseif ($args['status'][0] == 'undone') {
                    $where .= ' AND B.status IS null';
                }

            }

            if (isset($args['limit'])) {
                $limit = ' LIMIT ' . intval($args['limit'][0]);
            }

            $argn = array('user');
            foreach ($argn as $n)
            {
                if (isset($args[$n]))
                {
                    if (is_array($args[$n]))
                    {
                        $args[$n] = $this->db->quote_and_join($args[$n]);
                    } else {
                        $args[$n] = $this->db->quote_string($args[$n]);
                    }
                    $where .= sprintf(' AND %s IN (%s)',$n,$args[$n]);
                }
            }
        }
        $res = $this->db->query('SELECT A.page     AS page,
                                        A.md5      AS md5,
                                        A.date     AS date,
                                        A.user     AS user,
                                        A.text     AS text,
                                        A.creator  AS creator,
                                        A.msg      AS msg,
                                        B.status   AS status,
                                        B.closedby AS closedby
                                   FROM tasks A LEFT JOIN task_status B
                                     ON A.page = B.page
                                     AND A.md5 = B.md5
                                     '.$where.'
                                   ORDER BY A.page, A.pos' . $limit);
        $res = $this->db->res2arr($res);
        return $res;
    }

    /**
     * toggles a tasks status.
     *
     * @param string $page          page id of the task
     * @param string $md5           tasks md5 hash
     * @param string $commitmsg     a optional message to the task completion
     * @return false on undone a task or timestamp on task completion
     */
    function toggleTaskStatus($page, $md5, $commitmsg = ''){
        if(!$this->db) return array();
        $md5 = trim($md5);
        if(!$page || !$md5) return array();

        $commitmsg = strip_tags($commitmsg);

        $res = $this->db->query('SELECT status
                                   FROM task_status
                                  WHERE page = ?
                                    AND md5  = ?',
                                $page, $md5);
        $stat = $this->db->res2row($res);
        $stat = $stat['status'];

        if(!$stat){
            $name = $_SERVER['REMOTE_USER'];
            $stat = date('Y-m-d',time());
            $this->db->query('INSERT INTO task_status
                                    (page, md5, status, closedby)
                                    VALUES (?, ?, ?, ?)',
                                    $page, $md5, $stat, $name);
            $this->db->query('UPDATE tasks SET msg=? WHERE md5=?',$commitmsg, $md5);
            return $stat;
        }else{
            $this->db->query('DELETE FROM task_status
                               WHERE page = ?
                               AND md5  = ?',
                               $page, $md5);
            $this->db->query('UPDATE tasks SET msg=? WHERE md5=?', '', $md5);
            return false;
        }
    }

    /**
     * load all page stats from a given page.
     */
    function loadPageStatuses($page){
        return $this->getAllPageStatuses($page);
    }

    function _getUser() {
        global $USERINFO;
        if ($USERINFO['name']) return $USERINFO['name'];
        if ($_SERVER['REMOTE_USER']) return $_SERVER['REMOTE_USER'];
        return $_SERVER['REMOTE_ADDR'];
    }


    function getAllPageStatuses($page){
        if(!$this->db) return array();
        if(!$page) return array();

        $res = $this->db->query('
            SELECT 
                A.page     AS page,
                A.creator  AS creator,
                A.md5      AS md5,
                B.status   AS status,
                B.closedby AS closedby,
                A.msg      AS msg
            FROM tasks A 
            LEFT JOIN task_status B
            ON A.page = B.page
            AND A.md5 = B.md5
            WHERE A.page = ?',
            $page
        );

        return $this->db->res2arr($res);
    }

    /**
     * Get information about the number of tasks on a specefic id.
     *
     * result keys are
     *   count  - number of all tasks
     *   done   - number of all finished tasks
     *   undone - number of all tasks to do
     *
     * @param $id   String  Id of the wiki page - if no id is given the current page will be used.
     * @return array
     */
    function getPageTaskCount($id = '') {
        if (!$id) {
            global $ID;
            $id = $ID;
        }

        $tasks = $this->loadTasks(array('id'=>$id));

        $result = array(
            'count'  => count($tasks),
            'done'   => 0,
            'undone' => 0,
            'late'   => 0,
        );

        foreach ($tasks as $task) {
            if (empty($task['status'])) {
                $result['undone']++;
            } else {
                $result['done']++;
            }
            if (!empty($task['date']) && empty($task['status'])) {
                if (strtotime($task['date']) < time()) {
                    $result['late']++;
                }
            }
        }

        return $result;
    }

    /**
     * displays a small page task status view
     */
    function tpl_pageTasks($id = '', $return = false) {
        $count = $this->getPageTaskCount($id);
        if ($count['count'] == 0) return;

        if ($count['undone'] == 0) {// all tasks done
            $class   = 'do_done';
            $title = $this->getLang('title_alldone');
        } elseif ($count['late'] == 0) { // open tasks - no late
            $class   = 'do_undone';
            $title = sprintf($this->getLang('title_intime'), $count['undone']);
        } else { // late tasks
            $class   = 'do_late';
            $title = sprintf($this->getLang('title_late'), $count['undone'], $count['late']);
        }

        $out = '<div class="plugin__do_pagetasks" title="'.$title.'"><span class="'.$class.'">';
        $out .= $count['undone'];
        $out .= '</span></div>';

        if ($return) return $out;
        echo $out;
    }

    /**
     * get a pretty userlink
     * @param string $user users loginname
     * @return username with possible links
     */
    function getPrettyUser($user) {
        $userpage = $this->getConf('userpage');
        $res = '';
        if ($userpage !== '' && $user !== '') {
            return p_get_renderer('xhtml')->internallink(sprintf($userpage, $user),
                                                         '', '', true, 'navigation');

        } else {
            return editorinfo($user);
        }
    }
}

// vim:ts=4:sw=4:et:enc=utf-8:
