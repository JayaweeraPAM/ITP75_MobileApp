import { store } from '../data/store-mongo.js';

export async function getAllInstitutes(req, res) {
  try {
    const institutes = (await store.institutes.get()) || [];
    const validInstituteIds = new Set(institutes.map(i => i.id));

    const tutors = (await store.tutors.get()) || [];
    const instituteTutors = tutors.filter(t => t.instituteId && validInstituteIds.has(t.instituteId));
    
    const totalTutors = instituteTutors.length;
    
    const uniqueSubjects = new Set();
    instituteTutors.forEach(t => {
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach(s => {
          const subjectName = typeof s === 'object' ? s.subject : s;
          if (subjectName) {
            uniqueSubjects.add(subjectName.toLowerCase().trim());
          }
        });
      }
    });
    
    res.json({ institutes, totalTutors, totalSubjects: uniqueSubjects.size });
  } catch (err) {
    console.error('List institutes error:', err);
    res.status(500).json({ error: 'Failed to fetch institutes' });
  }
}

export async function getInstituteById(req, res) {
  try {
    const institute = await store.institutes.getById(req.params.id);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });

    // Fetch tutors that belong to this institute
    const tutors = (await store.tutors.get()) || [];
    const members = tutors.filter(t => t.instituteId === req.params.id);
    const users   = await store.users.get() || [];

    const tutorList = members.map(t => {
      const u = users.find(u => u.id === t.id);
      return {
        id: t.id,
        name: u?.fullName || t.fullName || 'Unknown',
        photoUrl: t.photoUrl || t.photo || '',
        subjects: t.subjects || [],
        hourlyRate: t.hourlyRate || t.rate || 0,
        location: t.location || '',
        avgRating: t.avgRating || 0,
        ratingCount: t.ratingCount || 0,
        instituteTimetable: t.instituteTimetable || '',
      };
    });

    res.json({ institute, tutors: tutorList });
  } catch (err) {
    console.error('Get institute error:', err);
    res.status(500).json({ error: 'Failed to fetch institute' });
  }
}

export async function createInstituteBlocked(req, res) {
  return res.status(405).json({
    error: 'Direct institute creation is disabled.',
    info: 'Institutes are created by approving tutor join requests (4+ tutors required) or through the institute manager registration form.',
  });
}

export async function updateInstitute(req, res) {
  try {
    const institute = await store.institutes.getById(req.params.id);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });

    // Only the institute manager (creator) can edit
    const dbMgrId = institute.managerId && typeof institute.managerId === 'object' && institute.managerId.toString ? institute.managerId.toString() : String(institute.managerId || '');
    const reqUserId = req.user.id && typeof req.user.id === 'object' && req.user.id.toString ? req.user.id.toString() : String(req.user.id || '');
    let isManager = dbMgrId.trim() === reqUserId.trim();

    if (!isManager) {
      const dbMgrName = String(institute.managerName || '').trim().toLowerCase();
      const reqUserName = String(req.user.name || req.user.fullName || '').trim().toLowerCase();
      if (dbMgrName && reqUserName && dbMgrName === reqUserName) isManager = true;

      const dbEmail = String(institute.managerEmail || '').trim().toLowerCase();
      const reqEmail = String(req.user.email || '').trim().toLowerCase();
      if (dbEmail && reqEmail && dbEmail === reqEmail) isManager = true;
    }

    if (!isManager) {
      return res.status(403).json({
        error: 'Only the institute manager (creator) can edit institute details.',
      });
    }

    const { name, description, location, timetable, photo } = req.body;
    const updates = {
      ...(name        !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(location    !== undefined && { location: location.trim() }),
      ...(timetable   !== undefined && { timetable: timetable.trim() }),
      ...(photo       !== undefined && { photo }),
      updatedAt: new Date().toISOString(),
    };

    await store.institutes.updateOne(req.params.id, updates);
    const updated = await store.institutes.getById(req.params.id);
    res.json({ success: true, institute: updated });
  } catch (err) {
    console.error('Update institute error:', err);
    res.status(500).json({ error: 'Failed to update institute' });
  }
}

export async function getMyInstitute(req, res) {
  try {
    if (req.user.role !== 'institute_manager') {
      return res.status(403).json({ error: 'Institute managers only' });
    }

    const institutes = (await store.institutes.get()) || [];
    let institute = institutes.find(i => {
      const dbMgrId = i.managerId && typeof i.managerId === 'object' && i.managerId.toString ? i.managerId.toString() : String(i.managerId || '');
      const reqUserId = req.user.id && typeof req.user.id === 'object' && req.user.id.toString ? req.user.id.toString() : String(req.user.id || '');
      if (dbMgrId.trim() === reqUserId.trim()) return true;

      const dbMgrName = String(i.managerName || '').trim().toLowerCase();
      const reqUserName = String(req.user.name || req.user.fullName || '').trim().toLowerCase();
      if (dbMgrName && reqUserName && dbMgrName === reqUserName) return true;

      const dbEmail = String(i.managerEmail || '').trim().toLowerCase();
      const reqEmail = String(req.user.email || '').trim().toLowerCase();
      if (dbEmail && reqEmail && dbEmail === reqEmail) return true;

      return false;
    });

    if (!institute) {
      institute = {
        id: req.user.id,
        name: `${req.user.name || 'Unnamed'}'s Institute`,
        description: 'No description set yet.',
        location: 'Colombo, Sri Lanka',
        managerId: req.user.id,
        managerName: req.user.name || 'Manager',
        createdBy: 'auto-fallback',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        registrationNo: '',
        photo: '',
      };
      await store.institutes.insertOne(institute);
    }

    // Get pending join requests from tutors
    const joinRequests = (await store.instituteJoinRequests?.get?.() || []).filter(
      r => r.instituteId === institute.id && (r.status === 'PENDING' || r.status === 'pending')
    );

    res.json({ institute, joinRequests });
  } catch (err) {
    console.error('Get my institute controller error:', err);
    res.status(500).json({ error: 'Failed to fetch institute' });
  }
}
