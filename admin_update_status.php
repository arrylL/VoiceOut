<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(["status" => "error", "message" => "Not authorized"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id     = (int)($data['id']     ?? 0);
$status = $data['status'] ?? '';
$remark = $data['remark'] ?? '';

if (!$id || !in_array($status, ['Pending', 'In-review', 'Resolved'])) {
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

// 1. Update concern — set resolved_at when resolving
if ($status === 'Resolved') {
    $stmt = $conn->prepare("UPDATE concerns SET status = ?, admin_remarks = ?, resolved_at = NOW() WHERE id = ?");
} else {
    $stmt = $conn->prepare("UPDATE concerns SET status = ?, admin_remarks = ? WHERE id = ?");
}
$stmt->bind_param("ssi", $status, $remark, $id);
$stmt->execute();
$stmt->close();

// 2. Get the concern owner + title
$q = $conn->prepare("SELECT user_id, title FROM concerns WHERE id = ?");
$q->bind_param("i", $id);
$q->execute();
$concern = $q->get_result()->fetch_assoc();
$q->close();

// 3. Insert a notification for In-review or Resolved
if ($concern && in_array($status, ['In-review', 'Resolved'])) {
    $msgType = $status === 'Resolved' ? 'Resolved' : 'In review';
    $msg = $status === 'Resolved'
        ? "Your concern \"{$concern['title']}\" has been resolved."
        : "Your concern \"{$concern['title']}\" is now under review.";

    $ins = $conn->prepare("INSERT INTO notifications (user_id, type, message, remark) VALUES (?, ?, ?, ?)");
    $ins->bind_param("isss", $concern['user_id'], $msgType, $msg, $remark);
    $ins->execute();
    $ins->close();
}

echo json_encode(["status" => "success", "message" => "Updated"]);
$conn->close();
?>