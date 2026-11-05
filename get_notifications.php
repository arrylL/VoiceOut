<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? 0;
if (!$user_id) {
    echo json_encode([]);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['t']    = $row['type'];
    $row['m']    = $row['message'];
    $row['d']    = date('M d, Y g:i A', strtotime($row['created_at']));
    $row['read'] = (bool)$row['is_read'];
    $rows[] = $row;
}

echo json_encode($rows);
$stmt->close();
$conn->close();
?>