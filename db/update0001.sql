CREATE TABLE tasks (
    page,
    md5,
    date,
    user,
    text
);

CREATE UNIQUE INDEX idx_tasks_page_md5 ON tasks(page, md5);

CREATE TABLE task_status (
    page,
    md5,
    status
);

CREATE UNIQUE INDEX idx_task_status_page_md5 ON task_status(page, md5);

