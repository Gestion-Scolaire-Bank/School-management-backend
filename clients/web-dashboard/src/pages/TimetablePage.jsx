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
import { useI18n } from "@/lib/i18n";

function toMinutes(v){
  if(v == null || v === "") return NaN;
  if(typeof v === "number") return v;
  if(String(v).includes(":")){ const [h,m]=String(v).split(":").map(Number); return h*60+m;}
  return Number(v);
}

function fmt(m){ const h=Math.floor(m/60), mi=m%60; return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`; }

// wyscolars parity (helpers/toCalendarEvents.ts): client-side overlap guard.
// Back-to-back slots are allowed; breaks count as blocking.
function hasTimeOverlap(daySlots, newStart, newEnd, ignoreKey = null){
  return daySlots.some((sl)=>{
    const key = `${sl.startTime}-${sl.endTime}-${sl.classTimeId || "break"}`;
    if(ignoreKey && key === ignoreKey) return false;
    return newStart < sl.endTime && sl.startTime < newEnd;
  });
}

export default function TimetablePage(){
  const { t } = useI18n();
  const DAYS = { 1: t("tt.day.1"), 2: t("tt.day.2"), 3: t("tt.day.3"), 4: t("tt.day.4"), 5: t("tt.day.5"), 6: t("tt.day.6"), 7: t("tt.day.7") };
  const DAY_OPTIONS = [1,2,3,4,5,6].map(n=>({value:String(n), label:DAYS[n]}));
  const role = getUser()?.role;
  const canManage = role==="ADMINISTRATEUR" || role==="DIRECTEUR";
  const [classes,setClasses]=useState([]);
  const [subjects,setSubjects]=useState([]);
  const [establishments,setEstablishments]=useState([]);
  const [teachers,setTeachers]=useState([]);
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
    // stale-while-revalidate: never wipe reference lists on error
    apiClient.get("/api/v1/admin/classes").then(r=>setClasses(r.data||[])).catch(()=>{});
    apiClient.get("/api/v1/admin/subjects").then(r=>setSubjects(r.data||[])).catch(()=>{});
    apiClient.get("/api/v1/admin/establishments").then(r=>setEstablishments(r.data||[])).catch(()=>{});
    apiClient.get("/api/auth/users").then(r=>{
      const list=(r.data||[]).filter(u=>u.role==="ENSEIGNANT");
      setTeachers(list);
    }).catch(()=>{});
    loadStaticLists();
  }
  function loadStaticLists(){
    // breaks/holidays are school-wide: fetch once, not on every class filter change
    tt.fetchBreakTimes().then(r=>setBtList(r.data||[])).catch(()=>{});
    tt.fetchHolidays().then(r=>setHolList(r.data||[])).catch(()=>{});
  }
  function loadClassTimes(){
    // only the classroom-filtered list refetches on filter change; keep stale rows visible
    tt.fetchClassTimes(filterClassroom?{classroomId:filterClassroom}:{}).then(r=>setCtList(r.data||[])).catch(()=>{});
  }
  function loadLists(){ loadClassTimes(); loadStaticLists(); }
  useEffect(()=>{ loadRef(); },[]);
  useEffect(()=>{ loadClassTimes(); },[filterClassroom]);

  async function handleCreateCT(e){
    e.preventDefault(); setCtStatus(null);
    try{
      const payload={...ctForm, startTime:toMinutes(ctForm.startTime), endTime:toMinutes(ctForm.endTime), dayOfWeek:Number(ctForm.dayOfWeek)};
      await tt.createClassTime(payload);
      setCtStatus({type:"success", text:t("tt.slot.created")});
      loadLists(); toast.add({title:t("tt.slot.created"), type:"success"});
    }catch(err){ setCtStatus({type:"error", text: err.response?.data?.detail || t("tt.slot.error")});}
  }
  async function handleDeleteCT(id){
    if(!confirm(t("tt.slot.delete.confirm"))) return;
    await tt.deleteClassTime(id); loadLists(); toast.add({title:t("tt.slot.deleted"), type:"success"});
  }
  async function handleCreateBT(e){
    e.preventDefault(); setBtStatus(null);
    try{
      await tt.createBreakTime({startTime:toMinutes(btForm.startTime), endTime:toMinutes(btForm.endTime), dayOfWeek:Number(btForm.dayOfWeek)});
      setBtStatus({type:"success", text:t("tt.break.created")}); loadLists();
    }catch(err){ setBtStatus({type:"error", text: err.response?.data?.detail||t("common.error")});}
  }
  async function handleCreateHoliday(e){
    e.preventDefault(); setHolStatus(null);
    try{ await tt.createHoliday(holForm); setHolStatus({type:"success", text:t("tt.holiday.created")}); setHolForm({name:"", startAt:"", endAt:"", type:"all_class"}); loadLists(); }catch(err){ setHolStatus({type:"error", text: err.response?.data?.detail||t("common.error")});}
  }
  async function handleLinkHoliday(e){
    e.preventDefault(); setHcStatus(null);
    try{ await tt.createHolidayClassroom(hcForm); setHcStatus({type:"success", text:t("tt.holiday.linked")}); setHcForm({holidayId:"", classroomId:""});}catch(err){ setHcStatus({type:"error", text: err.response?.data?.detail||t("common.error")});}
  }
  async function loadTimetable(){
    setLoadingTT(true); setTtError(null);
    try{
      let data;
      if(viewMode==="classroom"){
        if(!viewClassroom) throw new Error(t("tt.grid.error.class"));
        const params={weeks:4}; if(viewSubject) params.subjectId=viewSubject; if(viewTeacher) params.teacherId=viewTeacher;
        const res=await tt.fetchClassroomTimetable(viewClassroom, params);
        data=res.data;
      } else {
        if(!viewTeacher) throw new Error(t("tt.grid.error.teacher"));
        const res=await tt.fetchTeacherTimetable(viewTeacher, {weeks:4, subjectId: viewSubject||undefined});
        // teacher simulate returns classrooms; flatten first for display or show per classroom selector
        data=res.data;
      }
      setTimetable(data); setWeekIndex(0);
    }catch(err){ setTtError(err.response?.data?.detail || err.message || t("tt.grid.error.load"));}
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
        <h2 className="text-2xl font-semibold flex items-center gap-2"><CalendarDays className="size-6"/> {t("tt.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("tt.subtitle")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("tt.filter.title")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>{t("tt.filter.class")}</Label>
            <Select value={filterClassroom} onValueChange={setFilterClassroom}>
              <SelectTrigger className="w-56"><SelectValue placeholder={t("tt.filter.allClasses")} /></SelectTrigger>
              <SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name} ({c.level})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={loadLists}>{t("tt.filter.refresh")}</Button>
          {filterClassroom && <Button variant="ghost" onClick={()=>setFilterClassroom("")}>{t("tt.filter.clear")}</Button>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ClassTime CRUD */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="size-4"/> {t("tt.slot.title")}</CardTitle><CardDescription>{t("tt.slot.subtitle")}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <form onSubmit={handleCreateCT} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("tt.slot.field.class")}</Label>
                  <Select value={ctForm.classroomId} onValueChange={v=>setCtForm(f=>({...f, classroomId:v}))}>
                    <SelectTrigger><SelectValue placeholder={t("tt.slot.field.class")} /></SelectTrigger>
                    <SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("tt.slot.field.subject")}</Label>
                  <Select value={ctForm.subjectId} onValueChange={v=>setCtForm(f=>({...f, subjectId:v}))}>
                    <SelectTrigger><SelectValue placeholder={t("tt.slot.field.subject")} /></SelectTrigger>
                    <SelectContent>{subjects.map(s=> <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("tt.slot.field.teacher")}</Label>
                  <Select value={ctForm.teacherId} onValueChange={v=>setCtForm(f=>({...f, teacherId:v}))} required>
                    <SelectTrigger><SelectValue placeholder={t("tt.slot.field.teacher.placeholder")} /></SelectTrigger>
                    <SelectContent>
                      {teachers.length===0 ? <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("tt.slot.field.teacher.empty")}</div> : teachers.map(u=> <SelectItem key={u.id} value={u.id}>{u.fullName || `${u.firstName||""} ${u.lastName||""}`.trim() || u.email} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("tt.slot.field.start")}</Label>
                  <Input type="time" value={ctForm.startTime} onChange={e=>setCtForm(f=>({...f, startTime:e.target.value}))} required/>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("tt.slot.field.end")}</Label>
                  <Input type="time" value={ctForm.endTime} onChange={e=>setCtForm(f=>({...f, endTime:e.target.value}))} required/>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("tt.slot.field.day")}</Label>
                  <Select value={ctForm.dayOfWeek} onValueChange={v=>setCtForm(f=>({...f, dayOfWeek:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{DAY_OPTIONS.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Button type="submit" disabled={!ctForm.classroomId || !ctForm.subjectId || !ctForm.teacherId}>{t("tt.slot.create")}</Button></div>
                {ctStatus && <Alert variant={ctStatus.type==="success"?"success":"error"} className="sm:col-span-2">{ctStatus.text}</Alert>}
              </form>
            )}
            <div className="max-h-64 overflow-auto">
              {ctList.length===0 ? <EmptyState icon={Clock} message={t("tt.slot.empty")}/> : (
                <Table>
                  <TableHeader><TableRow><TableHead>{t("tt.slot.table.day")}</TableHead><TableHead>{t("tt.slot.table.time")}</TableHead><TableHead>{t("tt.slot.table.class")}</TableHead><TableHead>{t("tt.slot.table.subject")}</TableHead><TableHead>{t("tt.slot.table.teacher")}</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>{ctList.map(ct=> (
                    <TableRow key={ct.id}><TableCell>{DAYS[ct.dayOfWeek]}</TableCell><TableCell className="font-mono text-xs">{ct.startTimeLabel}-{ct.endTimeLabel}</TableCell><TableCell className="text-xs">{classes.find(c=>c.id===ct.classroomId)?.name || ct.classroomId.slice(0,6)}</TableCell><TableCell className="text-xs">{subjects.find(s=>s.id===ct.subjectId)?.name || ct.subjectId.slice(0,6)}</TableCell><TableCell className="font-mono text-xs">{ct.teacherId.slice(0,8)}</TableCell><TableCell>{canManage && <Button variant="ghost" size="sm" onClick={()=>handleDeleteCT(ct.id)}>{t("tt.slot.delete")}</Button>}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coffee className="size-4"/> {t("tt.break.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <form onSubmit={handleCreateBT} className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1.5"><Label>{t("tt.break.start")}</Label><Input type="time" value={btForm.startTime} onChange={e=>setBtForm(f=>({...f, startTime:e.target.value}))}/></div>
                  <div className="space-y-1.5"><Label>{t("tt.break.end")}</Label><Input type="time" value={btForm.endTime} onChange={e=>setBtForm(f=>({...f, endTime:e.target.value}))}/></div>
                  <div className="space-y-1.5"><Label>{t("tt.break.day")}</Label><Select value={btForm.dayOfWeek} onValueChange={v=>setBtForm(f=>({...f, dayOfWeek:v}))}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent>{DAY_OPTIONS.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
                  <Button type="submit" size="sm">{t("tt.break.add")}</Button>
                </form>
              )}
              {btStatus && <Alert variant={btStatus.type==="success"?"success":"error"}>{btStatus.text}</Alert>}
              {btList.length===0 ? <p className="text-sm text-muted-foreground">{t("tt.break.empty")}</p> : (
                <div className="flex flex-wrap gap-1">{btList.map(bt=> <Badge key={bt.id} variant="secondary" className="font-mono text-xs">{DAYS[bt.dayOfWeek]} {bt.startTimeLabel}-{bt.endTimeLabel} <button onClick={()=>{ if(confirm(t("tt.break.delete.confirm"))) tt.deleteBreakTime(bt.id).then(loadLists);}} className="ml-1 text-destructive">×</button></Badge>)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palmtree className="size-4"/> {t("tt.holiday.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <>
                  <form onSubmit={handleCreateHoliday} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2"><Label>{t("tt.holiday.field.name")}</Label><Input value={holForm.name} onChange={e=>setHolForm(f=>({...f, name:e.target.value}))} required placeholder={t("tt.holiday.field.name.placeholder")}/></div>
                    <div className="space-y-1.5"><Label>{t("tt.holiday.field.start")}</Label><Input type="date" value={holForm.startAt} onChange={e=>setHolForm(f=>({...f, startAt:e.target.value}))} required/></div>
                    <div className="space-y-1.5"><Label>{t("tt.holiday.field.end")}</Label><Input type="date" value={holForm.endAt} onChange={e=>setHolForm(f=>({...f, endAt:e.target.value}))} required/></div>
                    <div className="space-y-1.5"><Label>{t("tt.holiday.field.type")}</Label><Select value={holForm.type} onValueChange={v=>setHolForm(f=>({...f, type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all_class">{t("tt.holiday.type.all")}</SelectItem><SelectItem value="specific_class">{t("tt.holiday.type.specific")}</SelectItem></SelectContent></Select></div>
                    <div className="sm:col-span-2"><Button type="submit" size="sm">{t("tt.holiday.create")}</Button></div>
                  </form>
                  {holStatus && <Alert variant={holStatus.type==="success"?"success":"error"}>{holStatus.text}</Alert>}
                  <form onSubmit={handleLinkHoliday} className="flex gap-2 items-end border-t pt-3">
                    <div className="flex-1 space-y-1.5"><Label>{t("tt.holiday.link.title")}</Label>
                      <Select value={hcForm.holidayId} onValueChange={v=>setHcForm(f=>({...f, holidayId:v}))}><SelectTrigger><SelectValue placeholder={t("tt.holiday.link.holiday")} /></SelectTrigger><SelectContent>{holList.map(h=> <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="flex-1 space-y-1.5"><Label>{t("tt.holiday.link.class")}</Label><Select value={hcForm.classroomId} onValueChange={v=>setHcForm(f=>({...f, classroomId:v}))}><SelectTrigger><SelectValue placeholder={t("tt.holiday.link.class")} /></SelectTrigger><SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button type="submit" size="sm">{t("tt.holiday.link.submit")}</Button>
                  </form>
                  {hcStatus && <Alert variant={hcStatus.type==="success"?"success":"error"}>{hcStatus.text}</Alert>}
                </>
              )}
              {holList.length===0 ? <p className="text-sm text-muted-foreground">{t("tt.holiday.empty")}</p> : (
                <div className="space-y-1">{holList.map(h=> <div key={h.id} className="flex justify-between text-xs border rounded px-2 py-1"><span>{h.name} {h.startAt}→{h.endAt} <Badge variant="outline" className="ml-1">{h.type}</Badge></span><button onClick={()=> tt.deleteHoliday(h.id).then(loadLists)} className="text-destructive">{t("tt.holiday.delete")}</button></div>)}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tt.grid.title")}</CardTitle>
          <CardDescription>{t("tt.grid.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>{t("tt.grid.view")}</Label>
              <Select value={viewMode} onValueChange={setViewMode}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="classroom">{t("tt.grid.view.classroom")}</SelectItem><SelectItem value="teacher">{t("tt.grid.view.teacher")}</SelectItem></SelectContent></Select>
            </div>
            {viewMode==="classroom" ? (
              <>
                <div className="space-y-1.5"><Label>{t("tt.grid.field.class")}</Label><Select value={viewClassroom} onValueChange={setViewClassroom}><SelectTrigger className="w-56"><SelectValue placeholder={t("tt.grid.field.class.placeholder")} /></SelectTrigger><SelectContent>{classes.map(c=> <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>{t("tt.grid.field.teacherFilter")}</Label>
                  <Select value={viewTeacher || "__all"} onValueChange={v=>setViewTeacher(v==="__all"?"":v)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder={t("tt.slot.field.teacher.placeholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">{t("tt.grid.field.subject.all")}</SelectItem>
                      {teachers.map(u=> <SelectItem key={u.id} value={u.id}>{u.fullName || `${u.firstName||""} ${u.lastName||""}`.trim() || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1.5"><Label>{t("tt.grid.field.teacherId")}</Label>
                <Select value={viewTeacher} onValueChange={setViewTeacher}>
                  <SelectTrigger className="w-56"><SelectValue placeholder={t("tt.slot.field.teacher.placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(u=> <SelectItem key={u.id} value={u.id}>{u.fullName || `${u.firstName||""} ${u.lastName||""}`.trim() || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5"><Label>{t("tt.grid.field.subject")}</Label><Select value={viewSubject || "__all"} onValueChange={(v)=>setViewSubject(v === "__all" ? "" : v)}><SelectTrigger className="w-40"><SelectValue placeholder={t("tt.grid.field.subject.all")} /></SelectTrigger><SelectContent><SelectItem value="__all">{t("tt.grid.field.subject.all")}</SelectItem>{subjects.map(s=> <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={loadTimetable} disabled={loadingTT}>{loadingTT?t("tt.grid.loading"):t("tt.grid.show")}</Button>
          </div>
          {ttError && <Alert variant="error">{ttError}</Alert>}
          {viewMode==="teacher" && timetable?.classrooms && timetable.classrooms.length>1 && (
            <p className="text-xs text-muted-foreground">{t("tt.grid.teacherNote", { count: timetable.classrooms.length })}</p>
          )}
          {week && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={weekIndex<=0} onClick={()=>setWeekIndex(i=>i-1)}>{t("tt.grid.prev")}</Button>
              <span className="text-sm font-medium">{t("tt.grid.weekOf", { week: week.weekStart, from: week.days[0].date, to: week.days[6]?.date || week.days[week.days.length-1].date })}</span>
              <Button variant="outline" size="sm" disabled={weekIndex>=activeWeeks.length-1} onClick={()=>setWeekIndex(i=>i+1)}>{t("tt.grid.next")}</Button>
              <Badge variant="secondary">{weekIndex+1}/{activeWeeks.length}</Badge>
            </div>
          )}
          {!week ? <EmptyState icon={CalendarDays} message={t("tt.grid.empty")}/> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-24">{t("tt.grid.time")}</TableHead>{week.days.slice(0,6).map(d=> <TableHead key={d.date} className="min-w-28 text-center">{DAYS[d.dayOfWeek]}<br/><span className="font-normal text-xs">{d.date}</span></TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {sortedSlots.length===0 ? <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">{t("tt.grid.noSlots")}</TableCell></TableRow> :
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
                                  <div key={idx} className="flex items-center justify-center gap-1"><Badge variant="warning" className="text-xs"><Coffee className="size-3"/> {t("tt.break.label")} {fmt(sl.startTime)}-{fmt(sl.endTime)}</Badge></div>
                                ) : (
                                  <div key={idx} className="rounded-lg border border-border bg-card px-2 py-1 text-xs">
                                    <div className="font-medium truncate">{subjects.find(su=>su.id===sl.subjectId)?.name || sl.subject.slice(0,8)}</div>
                                    <div className="truncate text-[11px] text-muted-foreground">Prof {sl.teacherId.slice(0,6)} · {fmt(sl.startTime)}-{fmt(sl.endTime)}</div>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {sl.status==="holiday" && <Badge variant="warning" className="text-[10px] px-1 py-0">{t("tt.grid.status.holiday")}{sl.holidayName? `: ${sl.holidayName}`:""}</Badge>}
                                      {sl.status==="cancelled" && <Badge variant="destructive" className="text-[10px] px-1 py-0 line-through">{t("tt.grid.status.cancelled")}{sl.reason? `: ${sl.reason}`:""}</Badge>}
                                      {sl.status==="moved" && <Badge variant="default" className="text-[10px] px-1 py-0">{t("tt.grid.status.moved")}</Badge>}
                                      {sl.status==="deleted" && <Badge variant="secondary" className="text-[10px] px-1 py-0">{t("tt.grid.status.deleted")}</Badge>}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{
                                        const nt=prompt(t("tt.grid.move.start.prompt"), fmt(s)); if(!nt) return; const ne=prompt(t("tt.grid.move.end.prompt"), fmt(e)); if(!ne) return;
                                        const st=toMinutes(nt), en=toMinutes(ne); const dow=Number(prompt(t("tt.grid.move.day.prompt"), String(d.dayOfWeek))||d.dayOfWeek);
                                        if(!(st < en)){ toast.add({title:t("tt.grid.move.invalid"), type:"error"}); return; }
                                        if(hasTimeOverlap(d.slots, st, en, `${sl.startTime}-${sl.endTime}-${sl.classTimeId}`)){ toast.add({title:t("tt.grid.move.overlap"), type:"error"}); return; }
                                        try{ await tt.moveOccurrence(sl.classTimeId, d.date, {startTime:st, endTime:en, dayOfWeek:dow}); loadTimetable(); toast.add({title:t("tt.grid.moved"), type:"success"}); }
                                        catch(err){ toast.add({title: err.response?.data?.detail || t("tt.grid.move.error"), type:"error"}); }
                                      }}><Move className="size-3"/> {t("tt.grid.move")}</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{
                                        const reason=prompt(t("tt.grid.cancel.prompt"))||undefined; await tt.cancelOccurrence(sl.classTimeId, d.date, {reason}); loadTimetable();
                                      }}><Ban className="size-3"/> {t("tt.grid.cancel")}</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px] text-destructive" onClick={async()=>{
                                        if(!confirm(t("tt.grid.delete.confirm"))) return; await tt.deleteOccurrence(sl.classTimeId, d.date); loadTimetable();
                                      }}>{t("tt.grid.delete")}</Button>
                                      {sl.status!=="scheduled" && <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={async()=>{ await tt.restoreOccurrence(sl.classTimeId, d.date); loadTimetable();}}>{t("tt.grid.restore")}</Button>}
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
