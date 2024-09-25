module.exports = async (req, res, next) => {
    const sessionData = req.session.user;
    console.log(sessionData)
  
    if (!sessionData)
      return res.status(200).send({
        statusCode: "UNAUTHORIZED",
        statusValue: 401,
        status: 401,
        message: "Session expired please login again.",
      });
  
    if (sessionData.userType != "User")
      return res.status(200).send({
        statusCode: "UNAUTHORIZED",
        statusValue: 401,
        status: 401,
        message: "Session expired please login again.",
      });
    next();
};
  