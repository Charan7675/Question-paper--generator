<?php 
// Include database connection file
include 'connection.php';

// Start the session
session_start();

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Login Logic
    if (isset($_POST['login'])) {
        $username = mysqli_real_escape_string($conn, $_POST['username']);
        $password = $_POST['password'];

        // Use prepared statement to prevent SQL injection
        $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->bind_param("s", $username); // "s" means string type
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();

        // Check if user exists and if the password is correct
        if ($user && password_verify($password, $user['password'])) {
            // Successful login, store user session data
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];

            // Redirect to main page after successful login
            header("Location: main.html");
            exit;
        } else {
            // If the login fails, show an error message
            $message = "Invalid username or password!";
        }
        $stmt->close();
    }
}

// Close the connection
mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: url('https://png.pngtree.com/thumb_back/fh260/background/20210902/pngtree-college-entrance-examination-candidates-jumping-colored-buildings-to-open-high-and-image_790218.jpg') no-repeat center center fixed;
            background-size: cover;
            font-family: Arial, sans-serif;
        }
        .form-container {
            background-color: rgba(255, 255, 255, 0.8); /* Transparent background */
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            width: 300px;
            text-align: center;
        }
        .form-container h2 {
            margin-bottom: 20px;
        }
        .form-container .input-container {
            position: relative;
        }
        .form-container .input-container input {
            width: 100%;
            padding: 10px 10px 10px 40px;
            margin: 10px 0;
            box-sizing: border-box;
            border-radius: 5px;
            border: 1px solid #ccc;
        }
        .form-container .input-container .fa {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: #aaa;
        }
        .form-container button {
            width: 100%;
            padding: 10px;
            background-color: #10ade7;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 5px;
        }
        .form-container button:hover {
            background-color: #08a5f4;
        }
        .toggle-link {
            display: block;
            margin-top: 10px;
            cursor: pointer;
            color: #18bff2;
        }
        .message {
            margin-top: 10px;
            color: red;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h2>Login</h2>
        
        <!-- Login Form -->
        <form action="login.php" method="post">
            <div class="input-container">
                <i class="fa fa-envelope"></i>
                <input type="text" name="username" placeholder="Username" required>
            </div>
            <div class="input-container">
                <i class="fa fa-lock"></i>
                <input type="password" name="password" placeholder="Password" required>
            </div>
            <button type="submit" name="login">Login</button>
        </form>

        <p>Don't have an account? <a href="register.php">Register here</a></p>

        <?php if (isset($message)) { ?>
            <div class="message"><?php echo $message; ?></div>
        <?php } ?>
    </div>
</body>
</html>

