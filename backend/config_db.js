const mongoose=require('mongoose');

const connectDB=async ()=>{
    try{
        await mongoose.connect(process.env.mongo_url,{
            useNewUrlParser:true,
            useUnifiedTopology:true,
        })
        console.log("mongodb connected");
    }catch(error){
        console.error("Mongodb connection failed", error);
        process.exit(1);
    }
}
module.exports=connectDB
