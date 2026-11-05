<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? 0;
if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$current = $data['current'] ?? '';
$new     = $data['new']     ?? '';

if (strlen($new) < 6) {
    echo json_encode(["status" => "error", "message" => "New password must be at least 6 characters."]);
    exit;
}

$stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($current, $user['password_hash'])) {
    echo json_encode(["status" => "error", "message" => "Current password is incorrect."]);
    exit;
}

$new_hash = password_hash($new, PASSWORD_DEFAULT);
$upd = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
$upd->bind_param("si", $new_hash, $user_id);

if ($upd->execute()) {
    echo json_encode(["status" => "success", "message" => "Password changed."]);
} else {
    echo json_encode(["status" => "error", "message" => "DB error: " . $upd->error]);
}

$stmt->close();
$upd->close();
$conn->close();
?>