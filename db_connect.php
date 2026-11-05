<?php
date_default_timezone_set('Asia/Manila');

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "voiceout";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
$conn->query("SET time_zone = '+08:00'");
?>