<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

// Get the logged-in user's ID from the session
$user_id = $_SESSION['user_id'] ?? 0;

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit;
}

// Fetch ONLY this user's concerns, newest first
$stmt = $conn->prepare("SELECT * FROM concerns WHERE user_id = ? ORDER BY id DESC");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['uid']    = $row['user_id'];
    $row['by']     = $row['is_anonymous'] ? 'Anonymous' : 'You';
    $row['type']   = $row['concern_type'];
    $row['desc']   = $row['description'];
    $row['level']  = $row['urgency'];
    $row['date']   = date('M d, Y', strtotime($row['created_at']));
    $row['remark'] = $row['admin_remarks'] ?? '';
    $row['file']   = null;
    $rows[] = $row;
}

echo json_encode($rows);
$stmt->close();
$conn->close();
?>