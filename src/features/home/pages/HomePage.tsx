import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div>
      <div>Home Page</div>
      <Link to="/login">Go to Login</Link>
    </div>
  );
};

export default HomePage;
