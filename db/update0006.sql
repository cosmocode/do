
ALTER TABLE task_status ADD msg;

REPLACE INTO task_status SELECT task_status.page as page, task_status.md5 as md5, task_status.status as status, task_status.closedby as closedby, tasks.msg as msg FROM task_status, tasks WHERE task_status.md5 = tasks.md5;

ALTER TABLE tasks DROP msg;

