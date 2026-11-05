<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? 0;
if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$is_anonymous = !empty($data['is_anonymous']) ? 1 : 0;
$concern_type = $data['concern_type'] ?? '';
$title        = $data['title'] ?? '';
$description  = $data['description'] ?? '';
$urgency      = $data['urgency'] ?? 'Low';

$stmt = $conn->prepare("
    INSERT INTO concerns 
        (user_id, is_anonymous, concern_type, title, description, urgency, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
");
$stmt->bind_param("iissss", $user_id, $is_anonymous, $concern_type, $title, $description, $urgency);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Concern submitted"]);
} else {
    echo json_encode(["status" => "error", "message" => "Insert failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>