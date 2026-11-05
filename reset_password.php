<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

if ($action === 'lookup') {
    $student_id = $data['student_id'] ?? '';
    if (!$student_id) {
        echo json_encode(["status" => "error", "message" => "Enter your Student ID."]);
        exit;
    }

    $stmt = $conn->prepare("SELECT secret_question FROM users WHERE student_id = ?");
    $stmt->bind_param("s", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Student ID not found."]);
        exit;
    }

    if (empty($user['secret_question'])) {
        echo json_encode(["status" => "error", "message" => "This account has no secret question set."]);
        exit;
    }

    echo json_encode([
        "status" => "success",
        "question" => $user['secret_question']
    ]);
    exit;
}

if ($action === 'reset') {
    $student_id = $data['student_id'] ?? '';
    $answer     = $data['answer']     ?? '';
    $new        = $data['new']        ?? '';

    file_put_contents('reset_debug.log', 
        "NEW VALUE RECEIVED: [" . $new . "]\n", 
        FILE_APPEND);

    if (!$student_id || !$answer || !$new) {
        echo json_encode(["status" => "error", "message" => "Missing fields."]);
        exit;
    }
    if (strlen($new) < 6) {
        echo json_encode(["status" => "error", "message" => "New password must be at least 6 characters."]);
        exit;
    }

    $stmt = $conn->prepare("SELECT secret_answer_hash FROM users WHERE student_id = ?");
    $stmt->bind_param("s", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Student ID not found."]);
        exit;
    }

    // Normalize the answer the same way it was saved during registration
    $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $answer)));

    file_put_contents('reset_debug.log',
        "--- Reset attempt ---\n" .
        "ID: $student_id\n" .
        "Raw answer: '$answer'\n" .
        "Normalized: '$normalized'\n" .
        "Stored hash: {$user['secret_answer_hash']}\n\n",
        FILE_APPEND);

    if (!password_verify($normalized, $user['secret_answer_hash'])) {
        echo json_encode(["status" => "error", "message" => "That answer doesn't match."]);
        exit;
    }

    $new_hash = password_hash($new, PASSWORD_DEFAULT);
    $upd = $conn->prepare("UPDATE users SET password_hash = ? WHERE student_id = ?");
    $upd->bind_param("ss", $new_hash, $student_id);

    if ($upd->execute()) {
        echo json_encode(["status" => "success", "message" => "Password reset. You can log in now."]);
    } else {
        echo json_encode(["status" => "error", "message" => "DB error: " . $upd->error]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Unknown action"]);
$conn->close();
?>