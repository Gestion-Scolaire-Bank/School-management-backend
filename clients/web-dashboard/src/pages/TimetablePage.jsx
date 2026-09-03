import { useEffect, useState } from "react";
import apiClient from "../api/client";
import * as tt from "../api/timetable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/components/ui/toast";
import { CalendarDays, Clock, Coffee, Palmtree, Move, Ban } from "lucide-react";
import { getUser } from "../api/auth";

const DAYS = { 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" };
const DAY_OPTIONS = [1,2,3,4,5,6].map(n=>({value:String(n), label:DAYS[n]}));

function toMinutes(v){
  if(v.includes(":")){ const [h,m]=v.split(":").map(Number); return h*60+m;}
  return Number(v);
}
function fmt(m){ const h=Math.floor(m/60), mi=m%60; return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`; }

export default function TimetablePage(){
  const role = getUser()?.role;
  const canManage = role==="ADMINISTRATEUR" || role==="DIRECTEUR";
  const [classes,setClasses]=useState([]);
  const [subjects,setSubjects]=useState([]);
  const [establishments,setEstablishments]=useState([]);
  // creates
  const [ctForm,setCtForm]=useState({classroomId:"", subjectId:"", teacherId:"", startTime:"08:00", endTime:"09:00", dayOfWeek:"1"});
  const [ctStatus,setCtStatus]=useState(null);
  const [ctList,setCtList]=useState([]);
  const [filterClassroom,setFilterClassroom]=useState("");
  // break
  const [btForm,setBtForm]=useState({startTime:"10:00", endTime:"10:15", dayOfWeek:"1"});
  const [btList,setBtList]=useState([]);
  const [btStatus,setBtStatus]=useState(null);
  // holiday
  const [holForm,setHolForm]=useState({name:"", startAt:"", endAt:"", type:"all_class"});
  const [holList,setHolList]=useState([]);
  const [holStatus,setHolStatus]=useState(null);
  const [hcForm,setHcForm]=useState({holidayId:"", classroomId:""});
  const [hcStatus,setHcStatus]=useState(null);
  // timetable view
  const [viewClassroom,setViewClassroom]=useState("");
  const [viewTeacher,setViewTeacher]=useState("");
  const [viewSubject,setViewSubject]=useState("");
  const [viewMode,setViewMode]=useState("classroom"); // classroom | teacher
  const [timetable,setTimetable]=useState(null);
  const [weekIndex,setWeekIndex]=useState(0);
  const [loadingTT,setLoadingTT]=useState(false);
  const [ttError,setTtError]=useState(null);

  function loadRef(){
    apiClient.get("/api/v1/admin/classes").then(r=>setClasses(r.data||[])).catch(()=>{});
    apiClient.get("/api/v1/admin/subjects").then(r=>setSubjects(r.data||[])).catch(()=>{});
    apiClient.get("/api/v1/admin/establishments").then(r=>setEstablishments(r.data||[])).catch(()=>{});
    loadLists();
  }
  function loadLists(){
    tt.fetchClassTimes(filterClassroom?{classroomId:filterClassroom}:{}).then(r=>setCtList(r.data||[])).catch(()=>setCtList([]));
    tt.fetchBreakTimes().then(r=>setBtList(r.data||[])).catch(()=>setBtList([]));
    tt.fetchHolidays().then(r=>setHolList(r.data||[])).catch(()=>setHolList([]));
  }
  useEffect(()=>{ loadRef(); },[]);
  useEffect(()=>{ loadLists(); },[filterClassroom]);

  async function handleCreateCT(e){
    e.preventDefault(); setCtStatus(null);
    try{
      const payload={...ctForm, startTime:toMinutes(ctForm.startTime), endTime:toMinutes(ctForm.endTime), dayOfWeek:Number(ctForm.dayOfWeek)};
      await tt.createClassTime(payload);
      setCtStatus({type:"success", text:"Créneau créé."});
      loadLists(); toast.add({title:"Créneau créé", type:"success"});
    }catch(err){ setCtStatus({type:"error", text: err.response?.data?.detail || "Chevauchement ou erreur."});}
  }
  async function handleDeleteCT(id){
    if(!confirm("Supprimer ce créneau ?")) return;
    await tt.deleteClassTime(id); loadLists(); toast.add({title:"Supprimé", type:"success"});
  }
  async function handleCreateBT(e){
    e.preventDefault(); setBtStatus(null);
    try{
      await tt.createBreakTime({startTime:toMinutes(btForm.startTime), endTime:toMinutes(btForm.endTime), dayOfWeek:Number(btForm.dayOfWeek)});
      setBtStatus({type:"success", text:"Pause créée."}); loadLists();
    }catch(err){ setBtStatus({type:"error", text: err.response?.data?.detail||"Erreur"});}
  }
  async function handleCreateHoliday(e){
    e.preventDefault(); setHolStatus(null);
    try{ await tt.createHoliday(holForm); setHolStatus({type:"success", text:"Congé créé."}); setHolForm({name:"", startAt:"", endAt:"", type:"all_class"}); loadLists(); }catch(err){ setHolStatus({type:"error", text: err.response?.data?.detail||"Erreur"});}
  }
  async function handleLinkHoliday(e){
    e.preventDefault(); setHcStatus(null);
    try{ await tt.createHolidayClassroom(hcForm); setHcStatus({type:"success", text:"Associé."}); setHcForm({holidayId:"", classroomId:""});}catch(err){ setHcStatus({type:"error", text: err.response?.data?.detail||"Erreur"});}
  }
  async function loadTimetable(){
    setLoadingTT(true); setTtError(null);
    try{
      let data;
      if(viewMode==="classroom"){
        if(!viewClassroom) throw new Error("Choisissez une classe");
        const params={weeks:4}; if(viewSubject) params.subjectId=viewSubject; if(viewTeacher) params.teacherId=viewTeacher;
        const res=await tt.fetchClassroomTimetable(viewClassroom, params);
        data=res.data;
      } else {
        if(!viewTeacher) throw new Error("Saisissez l'ID enseignant");
        const res=await tt.fetchTeacherTimetable(viewTeacher, {weeks:4, subjectId: viewSubject||undefined});
        // teacher simulate returns classrooms; flatten first for display or show per classroom selector
        data=res.data;
      }
      setTimetable(data); setWeekIndex(0);
    }catch(err){ setTtError(err.response?.data?.detail || err.message || "Erreur chargement emploi du temps");}
    finally{ setLoadingTT(false);}
  }

  // derived week
  const weeks = timetable?.weeks || timetable?.classrooms?.[0]?.weeks || [];
  // teacher mode has classrooms array; show first classroom if weeks empty
  const activeWeeks = weeks;
  const week = activeWeeks[weekIndex];
  const timeSlots = new Set();
  if(week){
    week.days.forEach(d=> d.slots.forEach(s=> timeSlots.add(`${s.startTime}-${s.endTime}`)));
  }
  const sortedSlots = Array.from(timeSlots).sort((a,b)=> Number(a.split("-")[0]) - Number(b.split("-")[0]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2"><CalendarDays className="size-6"/> Emploi du temps</h2>
        <p className="text-sm text-muted-foreground">Gestion des créneaux (ClassTime), pauses (BreakTime), congés (Holiday) et occurrences — porté du kernel TimeTables de wyscolars. Overlap bloqué côté API (409).</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filtre d'affichage</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Classe (filtre liste)</Label>
            <Select value={filterClassroom} onValueChange={setFilterClassroom}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
              <SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name} ({c.level})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={loadLists}>Rafraîchir</Button>
          {filterClassroom && <Button variant="ghost" onClick={()=>setFilterClassroom("")}>Effacer filtre</Button>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ClassTime CRUD */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="size-4"/> Créneau de cours (ClassTime)</CardTitle><CardDescription>Matière + enseignant + jour/heure par classe. 1=Lundi ... 6=Samedi</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <form onSubmit={handleCreateCT} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Classe</Label>
                  <Select value={ctForm.classroomId} onValueChange={v=>setCtForm(f=>({...f, classroomId:v}))}>
                    <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                    <SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Matière</Label>
                  <Select value={ctForm.subjectId} onValueChange={v=>setCtForm(f=>({...f, subjectId:v}))}>
                    <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
                    <SelectContent>{subjects.map(s=> <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Enseignant ID (teacherId)</Label>
                  <Input value={ctForm.teacherId} onChange={e=>setCtForm(f=>({...f, teacherId:e.target.value}))} placeholder="UUID enseignant ou matricule" required/>
                </div>
                <div className="space-y-1.5">
                  <Label>Heure début</Label>
                  <Input type="time" value={ctForm.startTime} onChange={e=>setCtForm(f=>({...f, startTime:e.target.value}))} required/>
                </div>
                <div className="space-y-1.5">
                  <Label>Heure fin</Label>
                  <Input type="time" value={ctForm.endTime} onChange={e=>setCtForm(f=>({...f, endTime:e.target.value}))} required/>
                </div>
                <div className="space-y-1.5">
                  <Label>Jour</Label>
                  <Select value={ctForm.dayOfWeek} onValueChange={v=>setCtForm(f=>({...f, dayOfWeek:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{DAY_OPTIONS.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Button type="submit" disabled={!ctForm.classroomId || !ctForm.subjectId}>Créer créneau</Button></div>
                {ctStatus && <Alert variant={ctStatus.type==="success"?"success":"error"} className="sm:col-span-2">{ctStatus.text}</Alert>}
              </form>
            )}
            <div className="max-h-64 overflow-auto">
              {ctList.length===0 ? <EmptyState icon={Clock} message="Aucun créneau."/> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Jour</TableHead><TableHead>Heure</TableHead><TableHead>Classe</TableHead><TableHead>Matière</TableHead><TableHead>Enseignant</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>{ctList.map(ct=> (
                    <TableRow key={ct.id}><TableCell>{DAYS[ct.dayOfWeek]}</TableCell><TableCell className="font-mono text-xs">{ct.startTimeLabel}-{ct.endTimeLabel}</TableCell><TableCell className="text-xs">{classes.find(c=>c.id===ct.classroomId)?.name || ct.classroomId.slice(0,6)}</TableCell><TableCell className="text-xs">{subjects.find(s=>s.id===ct.subjectId)?.name || ct.subjectId.slice(0,6)}</TableCell><TableCell className="font-mono text-xs">{ct.teacherId.slice(0,8)}</TableCell><TableCell>{canManage && <Button variant="ghost" size="sm" onClick={()=>handleDeleteCT(ct.id)}>Suppr.</Button>}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coffee className="size-4"/> Pauses (BreakTime)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <form onSubmit={handleCreateBT} className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1.5"><Label>Début</Label><Input type="time" value={btForm.startTime} onChange={e=>setBtForm(f=>({...f, startTime:e.target.value}))}/></div>
                  <div className="space-y-1.5"><Label>Fin</Label><Input type="time" value={btForm.endTime} onChange={e=>setBtForm(f=>({...f, endTime:e.target.value}))}/></div>
                  <div className="space-y-1.5"><Label>Jour</Label><Select value={btForm.dayOfWeek} onValueChange={v=>setBtForm(f=>({...f, dayOfWeek:v}))}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent>{DAY_OPTIONS.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                  <Button type="submit" size="sm">Ajouter</Button>
                </form>
              )}
              {btStatus && <Alert variant={btStatus.type==="success"?"success":"error"}>{btStatus.text}</Alert>}
              {btList.length===0 ? <p className="text-sm text-muted-foreground">Aucune pause.</p> : (
                <div className="flex flex-wrap gap-1">{btList.map(bt=> <Badge key={bt.id} variant="secondary" className="font-mono text-xs">{DAYS[bt.dayOfWeek]} {bt.startTimeLabel}-{bt.endTimeLabel} <button onClick={()=>{ if(confirm("Supprimer ?")) tt.deleteBreakTime(bt.id).then(loadLists);}} className="ml-1 text-destructive">×</button></Badge>)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palmtree className="size-4"/> Congés (Holiday)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <>
                  <form onSubmit={handleCreateHoliday} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2"><Label>Nom</Label><Input value={holForm.name} onChange={e=>setHolForm(f=>({...f, name:e.target.value}))} required placeholder="ex. Vacances de Noël"/></div>
                    <div className="space-y-1.5"><Label>Début</Label><Input type="date" value={holForm.startAt} onChange={e=>setHolForm(f=>({...f, startAt:e.target.value}))} required/></div>
                    <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={holForm.endAt} onChange={e=>setHolForm(f=>({...f, endAt:e.target.value}))} required/></div>
                    <div className="space-y-1.5"><Label>Type</Label><Select value={holForm.type} onValueChange={v=>setHolForm(f=>({...f, type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all_class">Toutes classes</SelectItem><SelectItem value="specific_class">Classe spécifique</SelectItem></SelectContent></Select></div>
                    <div className="sm:col-span-2"><Button type="submit" size="sm">Créer congé</Button></div>
                  </form>
                  {holStatus && <Alert variant={holStatus.type==="success"?"success":"error"}>{holStatus.text}</Alert>}
                  <form onSubmit={handleLinkHoliday} className="flex gap-2 items-end border-t pt-3">
                    <div className="flex-1 space-y-1.5"><Label>Lier congé → classe</Label>
                      <Select value={hcForm.holidayId} onValueChange={v=>setHcForm(f=>({...f, holidayId:v}))}><SelectTrigger><SelectValue placeholder="Congé" /></SelectTrigger><SelectContent>{holList.map(h=> <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="flex-1 space-y-1.5"><Label>Classe</Label><Select value={hcForm.classroomId} onValueChange={v=>setHcForm(f=>({...f, classroomId:v}))}><SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger><SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button type="submit" size="sm">Lier</Button>
                  </form>
                  {hcStatus && <Alert variant={hcStatus.type==="success"?"success":"error"}>{hcStatus.text}</Alert>}
                </>
              )}
              {holList.length===0 ? <p className="text-sm text-muted-foreground">Aucun congé.</p> : (
                <div className="space-y-1">{holList.map(h=> <div key={h.id} className="flex justify-between text-xs border rounded px-2 py-1"><span>{h.name} {h.startAt}→{h.endAt} <Badge variant="outline" className="ml-1">{h.type}</Badge></span><button onClick={()=> tt.deleteHoliday(h.id).then(loadLists)} className="text-destructive">Suppr.</button></div>)}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grille hebdomadaire</CardTitle>
          <CardDescription>Simulation sur 4 semaines à partir d'aujourd'hui. Cliquez sur un créneau pour déplacer/annuler/supprimer une occurrence ponctuelle (wyscolars: moved/cancelled/deleted + restore).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Vue</Label>
              <Select value={viewMode} onValueChange={setViewMode}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="classroom">Par classe</SelectItem><SelectItem value="teacher">Par enseignant</SelectItem></SelectContent></Select>
            </div>
            {viewMode==="classroom" ? (
              <>
                <div className="space-y-1.5"><Label>Classe</Label><Select value={viewClassroom} onValueChange={setViewClassroom}><SelectTrigger className="w-56"><SelectValue placeholder="Choisir classe" /></SelectTrigger><SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Enseignant (filtre opt.)</Label><Input value={viewTeacher} onChange={e=>setViewTeacher(e.target.value)} placeholder="teacherId" className="w-40"/></div>
              </>
            ) : (
              <div className="space-y-1.5"><Label>Enseignant ID</Label><Input value={viewTeacher} onChange={e=>setViewTeacher(e.target.value)} placeholder="teacherId" className="w-56"/></div>
            )}
            <div className="space-y-1.5"><Label>Matière (filtre opt.)</Label><Select value={viewSubject} onValueChange={setViewSubject}><SelectTrigger className="w-40"><SelectValue placeholder="Toutes" /></SelectTrigger><SelectContent><SelectItem value="">Toutes</SelectItem>{subjects.map(s=> <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={loadTimetable} disabled={loadingTT}>{loadingTT?"Chargement...":"Afficher"}</Button>
          </div>
          {ttError && <Alert variant="error">{ttError}</Alert>}
          {viewMode==="teacher" && timetable?.classrooms && timetable.classrooms.length>1 && (
            <p className="text-xs text-muted-foreground">Enseignant présent dans {timetable.classrooms.length} classes — affichage groupé par classe (premier bloc ci-dessous). Utilisez le simulateur classe pour la vue fusionnée.</p>
          )}
          {week && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={weekIndex<=0} onClick={()=>setWeekIndex(i=>i-1)}>← Semaine précédente</Button>
              <span className="text-sm font-medium">Semaine du {week.weekStart} ({week.days[0].date} → {week.days[6]?.date || week.days[week.days.length-1].date})</span>
              <Button variant="outline" size="sm" disabled={weekIndex>=activeWeeks.length-1} onClick={()=>setWeekIndex(i=>i+1)}>Semaine suivante →</Button>
              <Badge variant="secondary">{weekIndex+1}/{activeWeeks.length}</Badge>
            </div>
          )}
          {!week ? <EmptyState icon={CalendarDays} message="Choisissez une classe/enseignant et cliquez Afficher."/> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-24">Heure</TableHead>{week.days.slice(0,6).map(d=> <TableHead key={d.date} className="min-w-28 text-center">{DAYS[d.dayOfWeek]}<br/><span className="font-normal text-xs">{d.date}</span></TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {sortedSlots.length===0 ? <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Aucun créneau cette semaine (vérifiez BreakTime/Holiday).</TableCell></TableRow> :
                  sortedSlots.map(slotKey=> {
                    const [sStr,eStr]=slotKey.split("-"); const s=Number(sStr), e=Number(eStr);
                    return (
                      <TableRow key={slotKey}>
                        <TableCell className="font-mono text-xs">{fmt(s)}-{fmt(e)}</TableCell>
                        {week.days.slice(0,6).map(d=>{
                          const slots=d.slots.filter(sl=> sl.startTime===s && sl.endTime===e);
                          if(slots.length===0) return <TableCell key={d.date} className="text-center text-muted-foreground">—</TableCell>;
                          return (
                            <TableCell key={d.date} className="p-1">
                              <div className="space-y-1">
                                {slots.map((sl,idx)=> sl.type==="break" ? (
                                  <div key={idx} className="rounded bg-amber-100 text-amber-900 text-xs px-2 py-1 text-center flex items-center justify-center gap-1"><Coffee className="size-3"/> Pause</div>
                                ) : (
                                  <div key={idx} className={`rounded text-xs px-2 py-1 ${sl.status==="holiday"?"bg-yellow-100 text-yellow-900": sl.status==="cancelled"?"bg-red-100 text-red-800 line-through": sl.status==="moved"?"bg-blue-100 text-blue-900": sl.status==="deleted"?"bg-gray-200": "bg-primary/10"}`}>
                                    <div className="font-medium truncate">{subjects.find(s=>s.id===sl.subjectId)?.name || sl.subject.slice(0,8)}</div>
                                    <div className="truncate text-[11px]">Prof {sl.teacherId.slice(0,6)}</div>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {sl.status!=="scheduled" && <Badge variant="outline" className="text-[10px] px-1 py-0">{sl.status}{sl.holidayName? `: ${sl.holidayName}`:""}{sl.reason? `: ${sl.reason}`:""}</Badge>}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{
                                        const nt=prompt("Nouvelle heure début HH:MM", fmt(s)); if(!nt) return; const ne=prompt("Heure fin HH:MM", fmt(e)); if(!ne) return;
                                        const st=toMinutes(nt), en=toMinutes(ne); const dow=Number(prompt("Jour 1-6", String(d.dayOfWeek))||d.dayOfWeek);
                                        await tt.moveOccurrence(sl.classTimeId, d.date, {startTime:st, endTime:en, dayOfWeek:dow}); loadTimetable(); toast.add({title:"Déplacé", type:"success"});
                                      }}><Move className="size-3"/> Déplacer</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{
                                        const reason=prompt("Motif annulation ?")||undefined; await tt.cancelOccurrence(sl.classTimeId, d.date, {reason}); loadTimetable();
                                      }}><Ban className="size-3"/> Annuler</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px] text-destructive" onClick={async()=>{
                                        if(!confirm("Supprimer cette occurrence ?")) return; await tt.deleteOccurrence(sl.classTimeId, d.date); loadTimetable();
                                      }}>Suppr.</Button>
                                      {sl.status!=="scheduled" && <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{ await tt.restoreOccurrence(sl.classTimeId, d.date); loadTimetable();}}>Restaurer</Button>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
