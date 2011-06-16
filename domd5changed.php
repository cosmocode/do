<?php

require '../../../inc/utf8.php';
 
$query =
"SELECT tasks.md5, tasks.page, tasks.text
 FROM tasks
-- WHERE text like '%&%;%'";
 
$sqlite = sqlite_open('../../../data/meta/do.sqlite');
 
sqlite_exec($sqlite, 'BEGIN TRANSACTION');
$res = sqlite_query($sqlite, $query);
sqlite_num_rows($res);
 
while ($row = sqlite_fetch_array($res)) {
    $row['tasks.text'] = trim(html_entity_decode(strip_tags($row['tasks.text']), ENT_QUOTES, 'UTF-8'));
    $md5 = md5(utf8_strtolower(preg_replace('/\s/', '', $row['tasks.text'])) .
               $row['tasks.page']);
    sqlite_exec($sqlite, 'UPDATE tasks SET text = \'' . sqlite_escape_string($row['tasks.text']) . '\', ' .
                                  'md5 = \'' . $md5 . '\' WHERE md5 = \'' . $row['tasks.md5'] . '\'
                                  AND page = \'' . $row['tasks.page'] . '\'');
    sqlite_exec($sqlite, 'UPDATE task_status SET md5 = \'' . $md5 . '\' WHERE md5 = \'' . $row['tasks.md5'] . '\'
                                  AND page = \'' . $row['tasks.page'] . '\'');
}
sqlite_exec($sqlite, 'COMMIT');
 
sqlite_close($sqlite);
