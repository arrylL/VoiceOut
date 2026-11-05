<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    $stmt = $conn->prepare("SELECT id, name, student_id, department, role FROM users WHERE id = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user) {
        echo json_encode([
            "logged_in" => true,
            "user" => [
                "db_id" => $user['id'],
                "id" => $user['student_id'],
                "name" => $user['name'],
                "dept" => $user['department'],
                "role" => $user['role'],
            ],
        ]);
        exit;
    }
}

echo json_encode(["logged_in" => false]);
$conn->close();
?>