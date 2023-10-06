const mysql = require('mysql2');
const pool = mysql.createPool({
  host: '',
  user: 'root',
  password: '',
  database: 'fantasy',
}).promise();


//databases 
async function fetchTeams(){
  const res = await pool.query("select * from teams");
  return res[0];
}
async function fetchTeam(id){
  const res = await pool.query("select * from teams where id = ?",[id]);
  return res[0];
}
async function createTeam(teamname , displayname){
  const res = await pool.query(`insert into teams(teamname,displayname) values (?,?) `,[teamname,displayname]);
  return res;
}

//contests

async function fetchContests(){
  const res = await pool.query("select * from contests");
  return res[0];
}
async function fetchContest(id){
  const res = await pool.query("select * from contests where id = ?",[id]);
  return res[0];
}
async function createContest(data){
  try{
    const res = await pool.query(`insert into contests(contestname,prize,total_slots,start_date,end_date,active_date,remaining_slots) values (?,?,?,?,?,?,?) `,data);
    return res;
  }
  catch {
    return ("you have entered wrong format,compulsary fields = contestname,prize,total_slots,start_date,end_date,active_date \n here date must of format YY-MM-DD ");
  }
}

async function updateContest(id,data){

  try{
    var values = [];
    var Query = 'update contests set ';
    for (const key in data) {
      Query += key + " = ? ,"
      values.push(data[key]);}
    Query = Query.slice(0, -1);
    values.push(id);
    Query += "where id = ?";
    const res = await pool.query(Query,values);
    return res;
  }
  catch {
    return ("you have entered wrong format,compulsary fields = contestname,prize,total_slots,start_date,end_date,active_date \n here date must of format YY-MM-DD ");
  }

}

//participate 
async function enterContest(contest_id,team_id){
  try{

    const res = await pool.query(`insert into participate(contest_id,team_id) values (?,?)`,[contest_id,team_id]);
    const curr = await pool.query(`select remaining_slots as s from contests where id = ?`,[contest_id]);
    const remaining = curr[0][0]['s'] - 1;
    await pool.query('update contests set remaining_slots = ? where id = ?' , [remaining,contest_id]);
    return res;

  }
  catch {
    return ("no such contest or team exist , please enter your team_id and contest_id of contest you want to enter");
  }
}

async function validateContest(contest_id,team_id){
  try{
    const res = await pool.query(`select Count(*) from participate where contest_id = ? AND team_id = ? `,[contest_id,team_id]);
    if(res[0][0]['Count(*)']){ // team already in contest
      console.log("d");
      return 0;
    }
    const limit = await pool.query('select  remaining_slots from contests where id = ?',[contest_id]);
    if(limit[0][0]['remaining_slots'] === 0){
      console.log("limit");
      return 0;
    }
    return 1;
  }
  catch {
    return 0;
  }
}

async function leaveContest(CID,TID){
  try {
    // Delete related records from the 'participation' table
     const result = await pool.query("DELETE FROM participate WHERE team_id = ? AND contest_id = ? ", [TID,CID]);

    // Check the result and send an appropriate response
    if (result[0].affectedRows === 0) {
      return "Sorry , your team is not in given contest";
    } else {

      const curr = await pool.query(`select remaining_slots as s from contests where id = ?`,[CID]);
      const remaining = curr[0][0]['s'] + 1;
      await pool.query(`update contests set remaining_slots = ? where id = ?`,[remaining,CID]);
      return "Your team has left the contest";
    }
  } catch (error) {
    return "Internal server error!"
  }
}




//urls 
const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
app.use(bodyParser.json());


//teams
app.get('/teams',async (req,res)=>{ 
  const result = await fetchTeams();
  res.send(result);
})
app.get('/teams/:id',async(req,res)=>{
  const id = req.params.id;
  const result = await fetchTeam(id);
  res.send(result);
})
app.post('/teams',async(req,res)=>{
  const {teamname,displayname} = req.body;
  const result = await createTeam(teamname,displayname);
  res.send({result});
})


//contests
app.get('/contests',async (req,res)=>{ 
  const result = await fetchContests();
  res.send(result);
})
app.get('/contests/:id',async(req,res)=>{
  const id = req.params.id;
  const result = await fetchContest(id);
  res.send(result);
})
app.post('/contests',async(req,res)=>{
  const {contestname,prize,total_slots,start_date,end_date,active_date} = req.body;
  const result = await createContest([contestname,prize,total_slots,start_date,end_date,active_date,total_slots]);
  res.send(result);
})

app.put('/contests/:id',async(req,res)=>{
  const id = req.params.id;
  const data = req.body;
  const result = await updateContest(id,data);
  res.send(result);
})

//participate 
app.post('/participate',async(req,res)=>{
  const {contest_id,team_id} = req.body;
  const ok = await validateContest(contest_id,team_id);
  if(ok){
    const result = await enterContest(contest_id,team_id);
    res.send(result);
  }else{
    res.status(400).send("invalid request");
  }  
})


//leave 
app.delete('/leave', async (req, res) => {
  const {CID,TID} = req.body;
  const result = await leaveContest(CID,TID);
  res.status(200).send(result);

});


app.listen(port,()=>{
  console.log("server ON");
})