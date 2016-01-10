var mcwiki=require("minecraft-wiki-extractor");
var mcdevs=require("mcdevs-wiki-extractor");
var fs=require("fs");
var levenshtein=require("levenshtein");

module.exports={
  writeAllEntities:writeAllEntities
};

function getEntities(date, cb)
{
  mcdevs.entities_extractor.getEntities(date,function(err,mcdevsEntities){
    mcwiki.entities_extractor.getEntities(date,function(err,mcwikiEntities){
      var mappings=mcdevsEntities.map(function(mcdevsEntity){
        return {
          mcdevsEntity:mcdevsEntity,
          mcwikiEntity:match(mcdevsEntity,mcwikiEntities)
        }
      });
      //console.log(mappings);
      var mergedEntities=mappings.map(function(both){
        var mcdevsEntity=both.mcdevsEntity;
        var mcwikiEntity=both.mcwikiEntity;
        return {
          id:mcdevsEntity.id,
          internalId:mcwikiEntity.id,
          name:mcwikiEntity.name,
          displayName:mcwikiEntity.displayName,
          type:mcdevsEntity.type,
          width:mcdevsEntity.width,
          height:mcdevsEntity.height,
          wikiCategory:mcwikiEntity.type
        }
      });
      cb(null,mergedEntities);
    });
  });
}

function match(mcdevsEntity,mcwikiEntities)
{
  var realMapping=null;
  var simplifiedMcDevName=mcdevsEntity.displayName.toLowerCase().replace(/\(.+?\)/g,"").trim();
  var mappings=mcwikiEntities.filter(function(mcwikiEntity){
    return simplifiedMcDevName.indexOf(mcwikiEntity.displayName.toLowerCase())!=-1 || mcwikiEntity.displayName.toLowerCase().indexOf(simplifiedMcDevName)!=-1;
  });
  var idMappings=mcwikiEntities.filter(function(mcwikiEntity){
    return mcwikiEntity.id==mcdevsEntity.id
  });

  if(mcdevsEntity.type=="mob" && idMappings.length!=0)
    realMapping=idMappings[0];
  else if(mappings.length==1) {
    realMapping=mappings[0];
  }
  else if(mcdevsEntity.displayName=="FireCharge (blaze projectile)") {
    realMapping=mcwikiEntities.filter(function(e){return e.displayName.indexOf("Blaze")!=-1})[0];
  }
  else if(mcdevsEntity.id==2) {
    realMapping=mcwikiEntities.filter(function(e){return e.id==1})[0];
  }
  else {
    var closestMcWiki=mcwikiEntities
      .map(function(e){
        return {
          lev:Math.min(levenshtein(simplifiedMcDevName,e.displayName.toLowerCase()),levenshtein(simplifiedMcDevName,e.name.toLowerCase())),
          e:e
        }
      })
      .sort(function(a,b){
        if(a.lev<b.lev)
          return -1;
        if(a.lev>b.lev)
          return 1;
        return 0;
      });
    realMapping=closestMcWiki[0].e;
  }

  //console.log(mcdevsEntity.displayName,realMapping ? realMapping.displayName : null);


  return realMapping;
}

function writeAllEntities(file,date, cb)
{
  getEntities(date,function(err,entities){
    fs.writeFile(file, JSON.stringify(entities,null,2), cb);
  })
}