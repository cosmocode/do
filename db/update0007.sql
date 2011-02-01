
-- Create the new assignee table
CREATE TABLE task_assignees (page, md5, user);

-- Fillin the valid users
INSERT INTO task_assignees (page, md5, user) SELECT page,md5,user FROM tasks WHERE user != '';

-- Remove the user column from tasks
CREATE TABLE tasks_tmp ( page, md5, date, text , creator , pos );
INSERT INTO tasks_tmp SElECT page, md5, date, text , creator , pos FROM tasks;
DROP TABLE tasks;

CREATE TABLE tasks ( page, md5, date, text , creator , pos);
INSERT INTO tasks SElECT page, md5, date, text , creator , pos FROM tasks_tmp;
DROP TABLE tasks_tmp;