<?php
require 'db_connect.php';

// Tell the browser we are sending back JSON data
header('Content-Type: application/json');

// Get the raw POST data (because JavaScript fetch() sends JSON, not standard form data)
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if ($data) {
    $name = $data['name'];
    $student_id = $data['student_id'];
    $department = $data['department'];
    $password = $data['password'];
    $secret_question = $data['secret_question'];
    $secret_answer = $data['secret_answer'];

    // 1. Hash the passwords for security
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $secret_answer_hash = password_hash($secret_answer, PASSWORD_DEFAULT);

    // 2. Insert into database using Prepared Statements
    $stmt = $conn->prepare("INSERT INTO users (name, student_id, department, password_hash, secret_question, secret_answer_hash) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $name, $student_id, $department, $password_hash, $secret_question, $secret_answer_hash);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Account created!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "No data received"]);
}
$conn->close();
?>