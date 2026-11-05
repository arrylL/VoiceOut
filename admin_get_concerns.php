<?php
session_start();
require 'db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(["status" => "error", "message" => "Not authorized"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT 
        c.*,
        u.name AS student_name,
        u.student_id AS student_id
    FROM concerns c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY 
        FIELD(c.status, 'Pending', 'In-review', 'Resolved') ASC,
        c.id DESC
");
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['uid']        = $row['user_id'];
    $row['by']         = $row['is_anonymous'] ? 'Anonymous' : ($row['student_name'] ?: 'Unknown');
    $row['type']       = $row['concern_type'];
    $row['desc']       = $row['description'];
    $row['level']      = $row['urgency'];
    $row['date']       = date('M d, Y', strtotime($row['created_at']));
    $row['remark']     = $row['admin_remarks'] ?? '';
    $row['file']       = null;

    // Fields the calendar uses (milliseconds for JS Date)
    // Parse using Asia/Manila explicitly to avoid relying on server defaults
    $row['createdAt']  = (new DateTime($row['created_at'], new DateTimeZone('Asia/Manila')))->getTimestamp() * 1000;
    $row['resolvedAt'] = !empty($row['resolved_at'])
        ? (new DateTime($row['resolved_at'], new DateTimeZone('Asia/Manila')))->getTimestamp() * 1000
        : null;
            
    $rows[] = $row;
}

echo json_encode($rows);
$stmt->close();
$conn->close();
?>