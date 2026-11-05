<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['student_id']) || empty($data['password'])) {
    echo json_encode(["status" => "error", "message" => "Missing credentials"]);
    exit;
}

$student_id = $data['student_id'];
$password   = $data['password'];

$stmt = $conn->prepare("SELECT id, name, student_id, department, password_hash, role FROM users WHERE student_id = ?");
$stmt->bind_param("s", $student_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    echo json_encode(["status" => "error", "message" => "Student ID not found"]);
    exit;
}

if (!password_verify($password, $user['password_hash'])) {
    echo json_encode(["status" => "error", "message" => "Incorrect password"]);
    exit;
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['role']    = $user['role'];

echo json_encode([
    "status" => "success",
    "user" => [
        "id"          => $user['id'],
        "student_id"  => $user['student_id'],
        "name"        => $user['name'],
        "department"  => $user['department'],
        "role"        => $user['role']
    ]
]);
$stmt->close();
$conn->close();
?>