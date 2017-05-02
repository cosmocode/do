<?php
/**
 * DokuWiki Plugin do (Helper Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr <gohr@cosmocode.de>
 * @author  Adrian Lang <lang@cosmocode.de>
 * @author  Dominik Eckelmann <eckelmann@cosmocode.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class helper_plugin_do extends DokuWiki_Plugin {

    /** @var helper_plugin_sqlite */
    private $db = null;

    /**
     * Constructor. Initializes the SQLite DB Connection
     */
    public function helper_plugin_do() {
        $this->db = plugin_load('helper', 'sqlite');
        if(!$this->db) {
            msg('The do plugin requires the sqlite plugin. Please install it');
            return;
        }
        if(!$this->db->init('do', dirname(__FILE__) . '/db/')) {
            $this->db = null;
        }
    }

    /**
     * Delete the all tasks from a given page id
     *
     * @param string $id page id
     */
    public function cleanPageTasks($id) {
        if(!$this->db) return;
        $this->db->query('DELETE FROM tasks WHERE page = ?', $id);
        $this->db->query('DELETE FROM task_assignees WHERE page = ?', $id);
    }

    /**
     * Save a task.
     *
     * @param array $data task informations as key value array.
     *                    keys are: page, md5, date, user, text, creator
     */
    public function saveTask($data) {
        if(!$this->db) return;

        $this->db->query(
            'INSERT INTO tasks (page,md5,date,text,creator,pos)
             VALUES (?, ?, ?, ?, ?, ?)',
            $data['page'],
            $data['md5'],
            $data['date'],
            $data['text'],
            $data['creator'],
            $data['pos']
        );
        foreach((array) $data['users'] as $userName) {
            $this->db->query(
                'INSERT INTO task_assignees (page,md5,user)
                 VALUES (?,?,?)',
                $data['page'],
                $data['md5'],
                $userName
            );
        }
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
     *  - md5       a single task
     *
     * @param array $args filters to apply
     * @param bool $checkAccess yes: check if item is hidden or blocked by ACL, false: skip this check
     * @return array filtered result.
     */
    public function loadTasks($args = null, $checkAccess = true) {
        if(!$this->db) return array();
        $where = ' WHERE 1=1';
        $limit = '';
        if(isset($args)) {
            if(isset($args['ns'])) {
                // Whatever you do here, test it against the following mappings
                // (current ID has to be NS1:NS2:PAGE):
                // '..:..' => ''
                // '.'     => 'NS1:NS2:'
                // 'NS3'  => 'NS1:NS2:NS3'
                // ':NS4'  => 'NS4'
                // ':'     => ''

                global $ID;
                $ns = trim(resolve_id(getNS($ID), $args['ns'], false), ':');
                if(strlen($ns) > 0) {
                    // Do not match NSbla with NS, but only NS:bla
                    $ns .= ':';
                }

                $where .= sprintf(' AND A.page LIKE %s', $this->db->quote_string($ns . '%'));
            }

            if(isset($args['id'])) {
                global $ID;
                if(!is_array($args['id'])) {
                    $args['id'] = array($args['id']);
                }
                $exists = false;
                resolve_pageid(getNS($ID), $args['id'][0], $exists);
                $where .= sprintf(' AND A.page = %s', $this->db->quote_string($args['id'][0]));
            }

            if(isset($args['status'])) {
                $status = utf8_strtolower($args['status'][0]);
                if($status == 'done') {
                    $where .= ' AND B.status IS NOT null';
                } elseif($status == 'undone') {
                    $where .= ' AND B.status IS null';
                }

            }

            if(isset($args['limit'])) {
                $limit = ' LIMIT ' . intval($args['limit'][0]);
            }

            if(isset($args['md5'])) {
                if(!is_array($args['md5'])) {
                    $args['md5'] = array($args['md5']);
                }
                $where .= ' AND A.md5 = ' . $this->db->quote_string($args['md5'][0]);
            }

            $argn = array('user', 'creator');
            foreach($argn as $n) {
                if(isset($args[$n])) {
                    if(!is_array($args[$n])) {
                        $args[$n] = array($args[$n]);
                    }
                    $search = $n;

                    /** @var DokuWiki_Auth_Plugin $auth */
                    global $auth;
                    if($auth && !$auth->isCaseSensitive()) {
                        $search = "lower($search)";
                        $args[$n] = array_map('utf8_strtolower', $args[$n]);
                    }
                    $args[$n] = $this->db->quote_and_join($args[$n]);

                    $where .= sprintf(' AND %s in (%s)', $search, $args[$n]);
                }
            }

        }
        if($checkAccess) {
            $where .= ' AND GETACCESSLEVEL(A.page) >= ' . AUTH_READ;
        }
        $query = 'SELECT A.page     AS page,
                        A.md5      AS md5,
                        A.date     AS date,
                        A.text     AS text,
                        A.creator  AS creator,
                        B.msg      AS msg,
                        B.status   AS status,
                        B.closedby AS closedby,
                        C.user     AS user
                   FROM tasks A LEFT JOIN task_status B
                     ON A.page = B.page
                     AND A.md5 = B.md5
                   LEFT JOIN task_assignees C
                     ON A.page = C.page
                     AND A.md5 = C.md5
                     ' . $where . '
                   ORDER BY A.page, A.pos' . $limit;
        $res = $this->db->query($query);
        $res = $this->db->res2arr($res);

        // merge assignees into users array
        $result = array();
        foreach($res as $row) {
            $key = $row['page'] . $row['md5'];
            if(!isset($result[$key])) {
                $result[$key] = $row;
                unset($result[$key]['user']);
                $result[$key]['users'] = array();
            }

            if($row['user'] !== null) {
                $result[$key]['users'][] = $row['user'];
            }
        }

        return array_values($result);
    }

    /**
     * Toggles a tasks status.
     *
     * @param string $page page id of the task
     * @param string $md5 tasks md5 hash
     * @param string $commitmsg a optional message to the task completion
     * @return bool|string|int
     *          false on undone a task
     *          or timestamp on task completion
     *          or -2 if not allowed
     */
    public function toggleTaskStatus($page, $md5, $commitmsg = '') {
        global $ID;

        if(!$this->db) return -2; //not allowed
        $md5 = trim($md5);
        if(!$page || !$md5) return -2; //not allowed

        $commitmsg = strip_tags($commitmsg);

        $res = $this->db->query(
            'SELECT A.page AS page,
                    B.status AS status
               FROM tasks A LEFT JOIN task_status B
                 ON A.page = B.page
                 AND A.md5 = B.md5
              WHERE A.page = ?
                AND A.md5  = ?',
            $page, $md5
        );
        $stat = $this->db->res2row($res);
        if($stat == false) {
            return -2; //not allowed, task don't exist
        }
        $stat = $stat['status'];

        // load task details and determine notify receivers
        $task = array_shift($this->loadTasks(array('id' => $ID, 'md5' => $md5)));
        $recs = (array) $task['users'];
        array_push($recs, $task['creator']);
        $recs = array_unique($recs);
        $recs = array_diff($recs, array($_SERVER['REMOTE_USER']));

        $name = $_SERVER['REMOTE_USER'];
        if(!$stat) {
            // close the task
            $stat = date('Y-m-d', time());
            $this->db->query(
                'INSERT INTO task_status
                     (page, md5, status, closedby, msg)
                 VALUES
                     (?, ?, ?, ?, ?)',
                $page, $md5, $stat, $name, $commitmsg
            );

            $this->sendMail($recs, 'close', $task, $name, $commitmsg);
            return $stat;
        } else {
            // reopen the task
            $this->db->query(
                'DELETE FROM task_status
                 WHERE page = ?
                   AND md5  = ?',
                $page, $md5
            );
            $this->sendMail($recs, 'reopen', $task, $name);
            return false;
        }
    }

    /**
     * Notify assignees or creators of new tasks and status changes
     *
     * @param array $receivers list of user names to notify
     * @param string $type type of notification (open|reopen|close)
     * @param array $task
     * @param string $user user who triggered the notification
     * @param string $msg the closing message if any
     */
    public function sendMail($receivers, $type, $task, $user = '', $msg = '') {
        global $conf;
        /** @var DokuWiki_Auth_Plugin $auth */
        global $auth;

        if(!$auth) return;
        if(!$this->getConf('notify_assignee')) return;
        $receivers = (array) $receivers;
        if(!count($receivers)) return;

        // prepare subject
        $subj = '[' . $conf['title'] . '] ';
        $subj .= sprintf($this->getLang('mail_' . $type), $task['text']);

        // prepare text
        $text = file_get_contents($this->localFN('mail_' . $type));
        $text = str_replace(
            array(
                '@USER@',
                '@DATE@',
                '@TASK@',
                '@TASKURL@',
                '@MSG@',
                '@DOKUWIKIURL@'
            ),
            array(
                isset($user) ? $user : $this->getLang('someone'),
                isset($task['date']) ? $task['date'] : $this->getLang('nodue'),
                $task['text'],
                wl($task['page'], '', true, '&') . '#plgdo__' . $task['md5'],
                $msg,
                DOKU_URL
            ),
            $text
        );

        // send mails
        foreach($receivers as $receiver) {
            $info = $auth->getUserData($receiver);
            if(!$info['mail']) continue;
            $to = $info['name'] . ' <' . $info['mail'] . '>';
            mail_send($to, $subj, $text, $conf['mailfrom']);
        }
    }

    /**
     * load all page stats from a given page.
     *
     * Note: doesn't check ACL
     *
     * @param string $page page id
     * @return array
     */
    public function getAllPageStatuses($page) {
        if(!$this->db) return array();
        if(!$page) return array();

        $res = $this->db->query(
           'SELECT
                A.page     AS page,
                A.creator  AS creator,
                A.md5      AS md5,
                B.status   AS status,
                B.closedby AS closedby,
                B.msg      AS msg
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
     * @param string $id String  Id of the wiki page - if no id is given the current page will be used.
     * @return array
     */
    public function getPageTaskCount($id = '') {
        if(!$id) {
            global $ID;
            $id = $ID;
        }
        if(auth_quickaclcheck($id) < AUTH_READ) {
            $tasks = array();
        } else {
            //for improving performance skip the access check in the query
            $tasks = $this->loadTasks(array('id' => $id), $checkAccess = false);
        }

        $result = array(
            'count' => count($tasks),
            'done' => 0,
            'undone' => 0,
            'late' => 0,
        );

        foreach($tasks as $task) {
            if(empty($task['status'])) {
                $result['undone']++;
            } else {
                $result['done']++;
            }
            if(!empty($task['date']) && empty($task['status'])) {
                if(strtotime($task['date']) < time()) {
                    $result['late']++;
                }
            }
        }

        return $result;
    }

    /**
     * displays a small page task status view
     *
     * @param string $id page id
     * @param bool $return if true return html, otherwise print the html
     * @return string|void
     */
    public function tpl_pageTasks($id = '', $return = false) {
        $count = $this->getPageTaskCount($id);
        if($count['count'] == 0) return;

        if($count['undone'] == 0) { // all tasks done
            $class = 'do_done';
            $title = $this->getLang('title_alldone');
        } elseif($count['late'] == 0) { // open tasks - no late
            $class = 'do_undone';
            $title = sprintf($this->getLang('title_intime'), $count['undone']);
        } else { // late tasks
            $class = 'do_late';
            $title = sprintf($this->getLang('title_late'), $count['undone'], $count['late']);
        }

        $out = '<div class="plugin__do_pagetasks" title="' . $title . '"><span class="' . $class . '">';
        $out .= $count['undone'];
        $out .= '</span></div>';

        if($return) return $out;
        echo $out;
    }

    /**
     * Get the html for an icon showing the user's open tasks
     *
     * If the user has open tasks, a js-overlay is shown on click.
     *
     * @return string the icon-html
     */
    public function tpl_getUserTasksIconHTML() {
        global $INPUT;
        if (!$INPUT->server->has('REMOTE_USER')) {
            return '';
        }
        $user = $INPUT->server->str('REMOTE_USER');
        $tasks = $this->loadTasks(array('status' => array('undone'),'user'   => $user));
        $num = count($tasks);

        $svg = inlineSVG(__DIR__ . '/pix/clipboard-text.svg');

        $doInner = '<span class="a11y">' . $this->getLang('prefix_tasks_user') . " </span>$svg<span class=\"num\">".count($tasks). '</span>';
        if ($user && $num > 0) {
            $title = sprintf($this->getLang('tasks_user_intime'), $num);
            $link = '<button class="plugin__do_usertasks" title="'.$title.'">'.$doInner.'</button>';
        } else {
            $title = $this->getLang('tasks_user_none');
            $link = '<span class="plugin__do_usertasks noopentasks" title="'.$title.'">'.$doInner.'</span>';
        }

        return $link;
    }

    /**
     * Get a pretty userlink
     *
     * @param string $user users loginname
     * @return string username with possible links
     */
    public function getPrettyUser($user) {
        $userpage = $this->getConf('userpage');
        if($userpage !== '' && $user !== '') {
            return p_get_renderer('xhtml')->internallink(
                sprintf($userpage, $user),
                '', '', true, 'navigation'
            );

        } else {
            return editorinfo($user);
        }
    }
}

