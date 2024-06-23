const nodemailer = require('nodemailer');

const sendMail = async(email,mailSubject,content) => {
    try{

        const transport = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,   //true when live
            requireTLS:true,  //false when live
            auth:{
                user:process.env.SMTP_MAIL,
                pass:process.env.SMTP_PASS
            }

        });

        const mailOptions = {
            from:process.env.SMTP_MAIL,
            to:email,
            subject:mailSubject,
            html:content
        }

        transport.sendMail(mailOptions,function(error,info){
            if(error){
                console.log(error);
            }else{
                console.log('Mail sent successfully: ',info.response)
            }
        })

    }catch(error){
        console.log(error.message);
    }
}

module.exports = {sendMail};