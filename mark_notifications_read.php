<?php
session_start();
require 'db_connect.php';
header('Content-Type: application/json');
$user_id = $_SESSION['user_id'] ?? 0;
if (!$user_id) { echo json_encode(["status" => "error"]); exit; }
$stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->close();
$conn->close();
echo json_encode(["status" => "success"]);
?>