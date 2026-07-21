import { NextResponse } from "next/server";
import { connectDb } from "@/db";
import { User, Client, Project, Template, Company } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { ensureCompanies } from "@/lib/seed-companies";

const defaultSections: Record<string, Array<{ id: string; name: string; items: Array<{ id: string; description: string; quantity: number; unit: string; rate: number }> }>> = {
  granny_flat: [
    { id: "s1", name: "Site Preparation", items: [{ id: "i1", description: "Site survey and set out", quantity: 1, unit: "lot", rate: 1500 }, { id: "i2", description: "Clear and grub site", quantity: 1, unit: "lot", rate: 2500 }, { id: "i3", description: "Temporary fencing", quantity: 1, unit: "lot", rate: 1200 }] },
    { id: "s2", name: "Excavation", items: [{ id: "i4", description: "Bulk excavation", quantity: 50, unit: "sqm", rate: 65 }, { id: "i5", description: "Detail excavation for footings", quantity: 1, unit: "lot", rate: 2000 }] },
    { id: "s3", name: "Concrete Slab", items: [{ id: "i6", description: "Subgrade preparation", quantity: 60, unit: "sqm", rate: 25 }, { id: "i7", description: "Vapor barrier", quantity: 60, unit: "sqm", rate: 12 }, { id: "i8", description: "Steel reinforcement", quantity: 60, unit: "sqm", rate: 45 }, { id: "i9", description: "Concrete pour and finish (100mm slab)", quantity: 60, unit: "sqm", rate: 85 }] },
    { id: "s4", name: "Framing", items: [{ id: "i10", description: "Wall framing (timber)", quantity: 120, unit: "lm", rate: 55 }, { id: "i11", description: "Roof framing (timber truss)", quantity: 60, unit: "sqm", rate: 75 }, { id: "i12", description: "Ceiling framing", quantity: 60, unit: "sqm", rate: 35 }] },
    { id: "s5", name: "Roofing", items: [{ id: "i13", description: "Roof battens", quantity: 60, unit: "sqm", rate: 22 }, { id: "i14", description: "Colorbond roof sheeting", quantity: 60, unit: "sqm", rate: 55 }, { id: "i15", description: "Guttering and downpipes", quantity: 30, unit: "lm", rate: 65 }, { id: "i16", description: "Flashing and capping", quantity: 1, unit: "lot", rate: 1500 }] },
    { id: "s6", name: "Insulation", items: [{ id: "i17", description: "Wall insulation (R2.5)", quantity: 100, unit: "sqm", rate: 15 }, { id: "i18", description: "Ceiling insulation (R5.0)", quantity: 60, unit: "sqm", rate: 22 }] },
    { id: "s7", name: "Brickwork", items: [{ id: "i19", description: "External brickwork", quantity: 80, unit: "sqm", rate: 120 }, { id: "i20", description: "Brick cleaning", quantity: 80, unit: "sqm", rate: 12 }] },
    { id: "s8", name: "Gyprock", items: [{ id: "i21", description: "Internal wall lining", quantity: 120, unit: "sqm", rate: 35 }, { id: "i22", description: "Ceiling lining", quantity: 60, unit: "sqm", rate: 42 }, { id: "i23", description: "Cornice", quantity: 50, unit: "lm", rate: 12 }] },
    { id: "s9", name: "Waterproofing", items: [{ id: "i24", description: "Bathroom waterproofing", quantity: 15, unit: "sqm", rate: 55 }, { id: "i25", description: "Laundry waterproofing", quantity: 5, unit: "sqm", rate: 55 }] },
    { id: "s10", name: "Tiling", items: [{ id: "i26", description: "Floor tiles (supply & lay)", quantity: 40, unit: "sqm", rate: 65 }, { id: "i27", description: "Wall tiles (supply & lay)", quantity: 25, unit: "sqm", rate: 75 }] },
    { id: "s11", name: "Painting", items: [{ id: "i28", description: "Internal painting", quantity: 200, unit: "sqm", rate: 18 }, { id: "i29", description: "External painting", quantity: 80, unit: "sqm", rate: 22 }, { id: "i30", description: "Trim and doors", quantity: 1, unit: "lot", rate: 1800 }] },
    { id: "s12", name: "Electrical", items: [{ id: "i31", description: "Switchboard and meter", quantity: 1, unit: "lot", rate: 2500 }, { id: "i32", description: "Power points and switches", quantity: 20, unit: "no", rate: 85 }, { id: "i33", description: "Light fixtures", quantity: 12, unit: "no", rate: 120 }, { id: "i34", description: "Smoke detectors", quantity: 3, unit: "no", rate: 95 }] },
    { id: "s13", name: "Plumbing", items: [{ id: "i35", description: "Water supply and connection", quantity: 1, unit: "lot", rate: 3500 }, { id: "i36", description: "Sewer connection", quantity: 1, unit: "lot", rate: 4000 }, { id: "i37", description: "Hot water system", quantity: 1, unit: "no", rate: 1800 }, { id: "i38", description: "Fixtures and fittings", quantity: 1, unit: "lot", rate: 2500 }] },
    { id: "s14", name: "Kitchen", items: [{ id: "i39", description: "Kitchen cabinetry", quantity: 1, unit: "lot", rate: 8500 }, { id: "i40", description: "Benchtop (stone)", quantity: 4, unit: "lm", rate: 650 }, { id: "i41", description: "Kitchen appliances", quantity: 1, unit: "lot", rate: 4500 }, { id: "i42", description: "Kitchen sink and tap", quantity: 1, unit: "no", rate: 850 }] },
    { id: "s15", name: "Bathroom", items: [{ id: "i43", description: "Bathroom cabinetry/vanity", quantity: 1, unit: "no", rate: 1500 }, { id: "i44", description: "Toilet suite", quantity: 1, unit: "no", rate: 450 }, { id: "i45", description: "Shower screen", quantity: 1, unit: "no", rate: 850 }, { id: "i46", description: "Bathroom accessories", quantity: 1, unit: "lot", rate: 500 }] },
    { id: "s16", name: "Final Completion", items: [{ id: "i47", description: "Internal doors and hardware", quantity: 6, unit: "no", rate: 350 }, { id: "i48", description: "Wardrobes", quantity: 2, unit: "no", rate: 1200 }, { id: "i49", description: "Window coverings", quantity: 8, unit: "no", rate: 250 }, { id: "i50", description: "Final clean", quantity: 1, unit: "lot", rate: 800 }, { id: "i51", description: "Certificate of occupancy", quantity: 1, unit: "lot", rate: 500 }] },
  ],
  single_storey: [
    { id: "s1", name: "Site Preparation", items: [{ id: "i1", description: "Site survey and set out", quantity: 1, unit: "lot", rate: 2000 }, { id: "i2", description: "Clear and grub site", quantity: 1, unit: "lot", rate: 3500 }, { id: "i3", description: "Temporary fencing and amenities", quantity: 1, unit: "lot", rate: 2500 }] },
    { id: "s2", name: "Excavation", items: [{ id: "i4", description: "Bulk excavation", quantity: 200, unit: "sqm", rate: 55 }, { id: "i5", description: "Detail excavation for footings", quantity: 1, unit: "lot", rate: 3500 }] },
    { id: "s3", name: "Concrete Slab", items: [{ id: "i6", description: "Subgrade preparation", quantity: 200, unit: "sqm", rate: 25 }, { id: "i7", description: "Vapor barrier and termite protection", quantity: 200, unit: "sqm", rate: 18 }, { id: "i8", description: "Steel reinforcement", quantity: 200, unit: "sqm", rate: 42 }, { id: "i9", description: "Concrete pour and finish", quantity: 200, unit: "sqm", rate: 78 }] },
    { id: "s4", name: "Framing", items: [{ id: "i10", description: "Ground floor wall framing", quantity: 250, unit: "lm", rate: 55 }, { id: "i11", description: "Roof framing (truss)", quantity: 200, unit: "sqm", rate: 72 }, { id: "i12", description: "Ceiling framing", quantity: 200, unit: "sqm", rate: 32 }] },
    { id: "s5", name: "Roofing", items: [{ id: "i13", description: "Roof battens and sarking", quantity: 200, unit: "sqm", rate: 28 }, { id: "i14", description: "Concrete roof tiles", quantity: 200, unit: "sqm", rate: 52 }, { id: "i15", description: "Guttering and downpipes", quantity: 55, unit: "lm", rate: 65 }, { id: "i16", description: "Flashing and ridge capping", quantity: 1, unit: "lot", rate: 3500 }] },
    { id: "s6", name: "Insulation", items: [{ id: "i17", description: "Wall insulation", quantity: 180, unit: "sqm", rate: 15 }, { id: "i18", description: "Ceiling insulation", quantity: 200, unit: "sqm", rate: 22 }] },
    { id: "s7", name: "Brickwork", items: [{ id: "i19", description: "External brickwork", quantity: 160, unit: "sqm", rate: 115 }, { id: "i20", description: "Internal brickwork", quantity: 30, unit: "sqm", rate: 95 }, { id: "i21", description: "Brick cleaning and pointing", quantity: 160, unit: "sqm", rate: 14 }] },
    { id: "s8", name: "Windows & Doors", items: [{ id: "i22", description: "Aluminium windows", quantity: 15, unit: "no", rate: 850 }, { id: "i23", description: "Sliding doors", quantity: 3, unit: "no", rate: 1500 }, { id: "i24", description: "Entry door", quantity: 1, unit: "no", rate: 2200 }] },
    { id: "s9", name: "Gyprock", items: [{ id: "i25", description: "Internal wall lining", quantity: 300, unit: "sqm", rate: 35 }, { id: "i26", description: "Ceiling lining", quantity: 200, unit: "sqm", rate: 42 }, { id: "i27", description: "Cornice and set down", quantity: 120, unit: "lm", rate: 12 }] },
    { id: "s10", name: "Waterproofing", items: [{ id: "i28", description: "Bathroom waterproofing", quantity: 25, unit: "sqm", rate: 55 }, { id: "i29", description: "Laundry and wet areas", quantity: 10, unit: "sqm", rate: 55 }] },
    { id: "s11", name: "Tiling", items: [{ id: "i30", description: "Floor tiles (supply & lay)", quantity: 120, unit: "sqm", rate: 62 }, { id: "i31", description: "Wall tiles (supply & lay)", quantity: 60, unit: "sqm", rate: 72 }] },
    { id: "s12", name: "Kitchen", items: [{ id: "i32", description: "Kitchen cabinetry", quantity: 1, unit: "lot", rate: 15000 }, { id: "i33", description: "Stone benchtop", quantity: 6, unit: "lm", rate: 680 }, { id: "i34", description: "Kitchen appliances package", quantity: 1, unit: "lot", rate: 6500 }] },
    { id: "s13", name: "Bathrooms", items: [{ id: "i35", description: "Ensuite fitout", quantity: 1, unit: "lot", rate: 5500 }, { id: "i36", description: "Main bathroom fitout", quantity: 1, unit: "lot", rate: 7500 }, { id: "i37", description: "Powder room", quantity: 1, unit: "lot", rate: 2500 }] },
    { id: "s14", name: "Electrical", items: [{ id: "i38", description: "Switchboard upgrade", quantity: 1, unit: "lot", rate: 3500 }, { id: "i39", description: "Wiring and power points", quantity: 1, unit: "lot", rate: 8500 }, { id: "i40", description: "Light fixtures", quantity: 25, unit: "no", rate: 150 }, { id: "i41", description: "Data points and TV", quantity: 10, unit: "no", rate: 120 }] },
    { id: "s15", name: "Plumbing", items: [{ id: "i42", description: "Water and sewer connection", quantity: 1, unit: "lot", rate: 8500 }, { id: "i43", description: "Hot water system (instantaneous)", quantity: 1, unit: "no", rate: 2200 }, { id: "i44", description: "Fixtures and tapware", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s16", name: "Painting", items: [{ id: "i45", description: "Internal painting", quantity: 450, unit: "sqm", rate: 18 }, { id: "i46", description: "External painting", quantity: 160, unit: "sqm", rate: 22 }, { id: "i47", description: "Trim, doors and architraves", quantity: 1, unit: "lot", rate: 3500 }] },
    { id: "s17", name: "Final Completion", items: [{ id: "i48", description: "Internal doors and hardware", quantity: 10, unit: "no", rate: 380 }, { id: "i49", description: "Built-in wardrobes", quantity: 4, unit: "no", rate: 1500 }, { id: "i50", description: "Window coverings", quantity: 15, unit: "no", rate: 280 }, { id: "i51", description: "Driveway and pathways", quantity: 1, unit: "lot", rate: 5500 }, { id: "i52", description: "Landscaping allowance", quantity: 1, unit: "lot", rate: 8000 }, { id: "i53", description: "Final clean and handover", quantity: 1, unit: "lot", rate: 1500 }, { id: "i54", description: "Certificate of occupancy", quantity: 1, unit: "lot", rate: 500 }] },
  ],
  double_storey: [
    { id: "s1", name: "Site Preparation", items: [{ id: "i1", description: "Site survey and set out", quantity: 1, unit: "lot", rate: 2500 }, { id: "i2", description: "Clear and grub site", quantity: 1, unit: "lot", rate: 4000 }, { id: "i3", description: "Temporary fencing and amenities", quantity: 1, unit: "lot", rate: 3000 }] },
    { id: "s2", name: "Excavation", items: [{ id: "i4", description: "Bulk excavation", quantity: 150, unit: "sqm", rate: 65 }, { id: "i5", description: "Detail excavation", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s3", name: "Concrete Works", items: [{ id: "i6", description: "Ground floor slab", quantity: 150, unit: "sqm", rate: 85 }, { id: "i7", description: "Upper floor slab (suspended)", quantity: 150, unit: "sqm", rate: 145 }, { id: "i8", description: "Reinforcement and formwork", quantity: 1, unit: "lot", rate: 12000 }] },
    { id: "s4", name: "Structural Steel", items: [{ id: "i9", description: "Steel beams and columns", quantity: 1, unit: "lot", rate: 15000 }, { id: "i10", description: "Steel connections and welding", quantity: 1, unit: "lot", rate: 5000 }] },
    { id: "s5", name: "Framing", items: [{ id: "i11", description: "Ground floor wall framing", quantity: 180, unit: "lm", rate: 58 }, { id: "i12", description: "Upper floor wall framing", quantity: 180, unit: "lm", rate: 62 }, { id: "i13", description: "Roof framing (truss)", quantity: 150, unit: "sqm", rate: 78 }] },
    { id: "s6", name: "Roofing", items: [{ id: "i14", description: "Roof covering (Colorbond)", quantity: 150, unit: "sqm", rate: 58 }, { id: "i15", description: "Guttering and downpipes", quantity: 60, unit: "lm", rate: 68 }, { id: "i16", description: "Flashing and capping", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s7", name: "Brickwork", items: [{ id: "i17", description: "External brickwork (ground floor)", quantity: 120, unit: "sqm", rate: 120 }, { id: "i18", description: "External brickwork (upper floor)", quantity: 120, unit: "sqm", rate: 135 }, { id: "i19", description: "Brick cleaning", quantity: 240, unit: "sqm", rate: 14 }] },
    { id: "s8", name: "Windows & Doors", items: [{ id: "i20", description: "Windows supply and install", quantity: 20, unit: "no", rate: 950 }, { id: "i21", description: "Entry door", quantity: 1, unit: "no", rate: 2500 }, { id: "i22", description: "Alfresco sliding door", quantity: 1, unit: "no", rate: 2200 }] },
    { id: "s9", name: "Insulation & Gyprock", items: [{ id: "i23", description: "Wall and ceiling insulation", quantity: 1, unit: "lot", rate: 7500 }, { id: "i24", description: "Internal wall lining", quantity: 450, unit: "sqm", rate: 36 }, { id: "i25", description: "Ceiling lining", quantity: 300, unit: "sqm", rate: 44 }] },
    { id: "s10", name: "Waterproofing & Tiling", items: [{ id: "i26", description: "Waterproofing (all wet areas)", quantity: 1, unit: "lot", rate: 3500 }, { id: "i27", description: "Floor tiles", quantity: 180, unit: "sqm", rate: 65 }, { id: "i28", description: "Wall tiles", quantity: 80, unit: "sqm", rate: 75 }] },
    { id: "s11", name: "Kitchen", items: [{ id: "i29", description: "Kitchen cabinetry", quantity: 1, unit: "lot", rate: 18000 }, { id: "i30", description: "Stone benchtop", quantity: 7, unit: "lm", rate: 700 }, { id: "i31", description: "Appliances package", quantity: 1, unit: "lot", rate: 8000 }, { id: "i32", description: "Butler's pantry fitout", quantity: 1, unit: "lot", rate: 5500 }] },
    { id: "s12", name: "Bathrooms", items: [{ id: "i33", description: "Ensuite fitout", quantity: 1, unit: "lot", rate: 6500 }, { id: "i34", description: "Main bathroom fitout", quantity: 1, unit: "lot", rate: 9000 }, { id: "i35", description: "Guest bathroom", quantity: 1, unit: "lot", rate: 5500 }, { id: "i36", description: "Powder room", quantity: 1, unit: "lot", rate: 2500 }] },
    { id: "s13", name: "Electrical", items: [{ id: "i37", description: "Complete electrical installation", quantity: 1, unit: "lot", rate: 18000 }, { id: "i38", description: "Light fixtures", quantity: 35, unit: "no", rate: 165 }, { id: "i39", description: "Home automation prep", quantity: 1, unit: "lot", rate: 3500 }] },
    { id: "s14", name: "Plumbing", items: [{ id: "i40", description: "Complete plumbing installation", quantity: 1, unit: "lot", rate: 15000 }, { id: "i41", description: "Hot water system", quantity: 1, unit: "no", rate: 2800 }] },
    { id: "s15", name: "Painting", items: [{ id: "i42", description: "Internal painting", quantity: 600, unit: "sqm", rate: 19 }, { id: "i43", description: "External painting", quantity: 200, unit: "sqm", rate: 24 }] },
    { id: "s16", name: "Staircase", items: [{ id: "i44", description: "Internal staircase (timber)", quantity: 1, unit: "no", rate: 8500 }, { id: "i45", description: "Balustrading", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s17", name: "Final Completion", items: [{ id: "i46", description: "Doors and hardware", quantity: 14, unit: "no", rate: 400 }, { id: "i47", description: "Wardrobes and storage", quantity: 5, unit: "no", rate: 1800 }, { id: "i48", description: "Driveway and landscaping", quantity: 1, unit: "lot", rate: 12000 }, { id: "i49", description: "Final clean and handover", quantity: 1, unit: "lot", rate: 2000 }] },
  ],
  duplex: [
    { id: "s1", name: "Site Preparation", items: [{ id: "i1", description: "Site survey and set out (dual occupancy)", quantity: 1, unit: "lot", rate: 3500 }, { id: "i2", description: "Clear and grub site", quantity: 1, unit: "lot", rate: 5000 }] },
    { id: "s2", name: "Excavation", items: [{ id: "i3", description: "Bulk excavation", quantity: 300, unit: "sqm", rate: 60 }, { id: "i4", description: "Detail excavation", quantity: 1, unit: "lot", rate: 5500 }] },
    { id: "s3", name: "Concrete Works", items: [{ id: "i5", description: "Slab - Unit A", quantity: 120, unit: "sqm", rate: 85 }, { id: "i6", description: "Slab - Unit B", quantity: 120, unit: "sqm", rate: 85 }, { id: "i7", description: "Common wall footing", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s4", name: "Framing", items: [{ id: "i8", description: "Wall framing - Unit A", quantity: 180, unit: "lm", rate: 55 }, { id: "i9", description: "Wall framing - Unit B", quantity: 180, unit: "lm", rate: 55 }, { id: "i10", description: "Roof framing", quantity: 240, unit: "sqm", rate: 72 }] },
    { id: "s5", name: "Roofing", items: [{ id: "i11", description: "Roof covering", quantity: 240, unit: "sqm", rate: 55 }, { id: "i12", description: "Guttering and downpipes", quantity: 70, unit: "lm", rate: 65 }] },
    { id: "s6", name: "Brickwork", items: [{ id: "i13", description: "External brickwork", quantity: 280, unit: "sqm", rate: 118 }, { id: "i14", description: "Fire rated common wall", quantity: 50, unit: "sqm", rate: 165 }] },
    { id: "s7", name: "Internal Fitout (x2)", items: [{ id: "i15", description: "Insulation (both units)", quantity: 1, unit: "lot", rate: 5500 }, { id: "i16", description: "Gyprock (both units)", quantity: 1, unit: "lot", rate: 12000 }, { id: "i17", description: "Waterproofing (both units)", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s8", name: "Kitchens (x2)", items: [{ id: "i18", description: "Kitchen cabinetry (both units)", quantity: 2, unit: "no", rate: 12000 }, { id: "i19", description: "Appliances (both units)", quantity: 2, unit: "lot", rate: 6000 }] },
    { id: "s9", name: "Bathrooms (x4)", items: [{ id: "i20", description: "Bathroom fitout (4 bathrooms)", quantity: 4, unit: "no", rate: 7000 }] },
    { id: "s10", name: "Electrical & Plumbing", items: [{ id: "i21", description: "Electrical (both units)", quantity: 2, unit: "lot", rate: 9500 }, { id: "i22", description: "Plumbing (both units)", quantity: 2, unit: "lot", rate: 8500 }, { id: "i23", description: "Hot water systems", quantity: 2, unit: "no", rate: 2200 }] },
    { id: "s11", name: "Painting & Finishing", items: [{ id: "i24", description: "Internal painting (both units)", quantity: 500, unit: "sqm", rate: 18 }, { id: "i25", description: "External painting", quantity: 280, unit: "sqm", rate: 22 }] },
    { id: "s12", name: "Final Completion", items: [{ id: "i26", description: "Doors and hardware (both units)", quantity: 1, unit: "lot", rate: 6500 }, { id: "i27", description: "Driveways and landscaping", quantity: 1, unit: "lot", rate: 10000 }, { id: "i28", description: "Final clean and handover", quantity: 1, unit: "lot", rate: 2500 }] },
  ],
  townhouse: [
    { id: "s1", name: "Site Preparation", items: [{ id: "i1", description: "Site survey and set out", quantity: 1, unit: "lot", rate: 3000 }, { id: "i2", description: "Clear site", quantity: 1, unit: "lot", rate: 4500 }] },
    { id: "s2", name: "Structural Works", items: [{ id: "i3", description: "Excavation", quantity: 1, unit: "lot", rate: 8000 }, { id: "i4", description: "Concrete slab and footings", quantity: 1, unit: "lot", rate: 18000 }, { id: "i5", description: "Structural steel", quantity: 1, unit: "lot", rate: 12000 }] },
    { id: "s3", name: "Framing & Roofing", items: [{ id: "i6", description: "Wall and roof framing", quantity: 1, unit: "lot", rate: 25000 }, { id: "i7", description: "Roof covering", quantity: 120, unit: "sqm", rate: 55 }, { id: "i8", description: "Guttering", quantity: 35, unit: "lm", rate: 65 }] },
    { id: "s4", name: "External Works", items: [{ id: "i9", description: "Brickwork", quantity: 150, unit: "sqm", rate: 120 }, { id: "i10", description: "Windows and doors", quantity: 1, unit: "lot", rate: 12000 }] },
    { id: "s5", name: "Internal Fitout", items: [{ id: "i11", description: "Insulation", quantity: 1, unit: "lot", rate: 4000 }, { id: "i12", description: "Gyprock", quantity: 1, unit: "lot", rate: 8000 }, { id: "i13", description: "Waterproofing", quantity: 1, unit: "lot", rate: 3000 }, { id: "i14", description: "Tiling", quantity: 1, unit: "lot", rate: 6500 }] },
    { id: "s6", name: "Kitchen & Bathrooms", items: [{ id: "i15", description: "Kitchen", quantity: 1, unit: "lot", rate: 14000 }, { id: "i16", description: "Bathrooms", quantity: 1, unit: "lot", rate: 12000 }] },
    { id: "s7", name: "Services", items: [{ id: "i17", description: "Electrical", quantity: 1, unit: "lot", rate: 9000 }, { id: "i18", description: "Plumbing", quantity: 1, unit: "lot", rate: 8000 }] },
    { id: "s8", name: "Finishing", items: [{ id: "i19", description: "Painting", quantity: 1, unit: "lot", rate: 8000 }, { id: "i20", description: "Doors and hardware", quantity: 1, unit: "lot", rate: 5000 }, { id: "i21", description: "Final completion", quantity: 1, unit: "lot", rate: 4000 }] },
  ],
  renovation: [
    { id: "s1", name: "Pre-Construction", items: [{ id: "i1", description: "Building inspections and reports", quantity: 1, unit: "lot", rate: 2500 }, { id: "i2", description: "DA and CC fees", quantity: 1, unit: "lot", rate: 3500 }, { id: "i3", description: "Temporary works and protection", quantity: 1, unit: "lot", rate: 2000 }] },
    { id: "s2", name: "Demolition", items: [{ id: "i4", description: "Selective demolition", quantity: 1, unit: "lot", rate: 5000 }, { id: "i5", description: "Asbestos removal (if required)", quantity: 1, unit: "lot", rate: 3500 }, { id: "i6", description: "Waste removal", quantity: 1, unit: "lot", rate: 1500 }] },
    { id: "s3", name: "Structural Works", items: [{ id: "i7", description: "Structural modifications", quantity: 1, unit: "lot", rate: 8000 }, { id: "i8", description: "Wall removal and support", quantity: 1, unit: "lot", rate: 5500 }] },
    { id: "s4", name: "New Construction", items: [{ id: "i9", description: "Extension framing", quantity: 50, unit: "sqm", rate: 85 }, { id: "i10", description: "New roof tie-in", quantity: 1, unit: "lot", rate: 6500 }, { id: "i11", description: "New slab and footings", quantity: 1, unit: "lot", rate: 8000 }] },
    { id: "s5", name: "Internal Fitout", items: [{ id: "i12", description: "Gyprock and plastering", quantity: 1, unit: "lot", rate: 6000 }, { id: "i13", description: "Waterproofing", quantity: 1, unit: "lot", rate: 2500 }, { id: "i14", description: "Tiling", quantity: 1, unit: "lot", rate: 5000 }] },
    { id: "s6", name: "Kitchen Renovation", items: [{ id: "i15", description: "New kitchen cabinetry", quantity: 1, unit: "lot", rate: 16000 }, { id: "i16", description: "Stone benchtop", quantity: 5, unit: "lm", rate: 700 }, { id: "i17", description: "New appliances", quantity: 1, unit: "lot", rate: 7000 }] },
    { id: "s7", name: "Bathroom Renovation", items: [{ id: "i18", description: "Bathroom renovation", quantity: 1, unit: "lot", rate: 12000 }, { id: "i19", description: "Ensuite renovation", quantity: 1, unit: "lot", rate: 9000 }] },
    { id: "s8", name: "Services Update", items: [{ id: "i20", description: "Electrical upgrade", quantity: 1, unit: "lot", rate: 6500 }, { id: "i21", description: "Plumbing update", quantity: 1, unit: "lot", rate: 5500 }] },
    { id: "s9", name: "Finishing", items: [{ id: "i22", description: "Painting (internal and external)", quantity: 1, unit: "lot", rate: 7500 }, { id: "i23", description: "Flooring", quantity: 80, unit: "sqm", rate: 55 }, { id: "i24", description: "Final clean and handover", quantity: 1, unit: "lot", rate: 1200 }] },
  ],
};

export async function GET() {
  try {
    await connectDb();

    const { constructionId, engineeringId } = await ensureCompanies();

    // Create admin user (Hujurat Construction owner)
    const adminId = generateId();
    const hashedPassword = await hashPassword("hujurat123!@#");
    await User.findOneAndUpdate(
      { email: "hujuratconstruction@gmail.com" },
      { $setOnInsert: { _id: adminId, name: "Hujurat Admin", email: "hujuratconstruction@gmail.com", password: hashedPassword, role: "admin" } },
      { upsert: true }
    ).lean();

    // Create staff user
    const staffId = generateId();
    const staffPassword = await hashPassword("staff123");
    await User.findOneAndUpdate(
      { email: "staff@hujurat.com" },
      { $setOnInsert: { _id: staffId, name: "Staff Member", email: "staff@hujurat.com", password: staffPassword, role: "staff" } },
      { upsert: true }
    ).lean();

    // Create sample clients
    const client1Id = generateId();
    const client2Id = generateId();
    const client3Id = generateId();

    const clientData = [
      { _id: client1Id, companyId: constructionId, name: "John Smith", companyName: "Smith Properties", phone: "0412 345 678", email: "john@smithproperties.com.au", address: "15 Harbour St, Sydney NSW 2000", notes: "Preferred client - multiple projects" },
      { _id: client2Id, companyId: constructionId, name: "Sarah Johnson", companyName: "", phone: "0423 456 789", email: "sarah.j@email.com", address: "22 George St, Parramatta NSW 2150", notes: "" },
      { _id: client3Id, companyId: constructionId, name: "David Chen", companyName: "Chen Investments Pty Ltd", phone: "0434 567 890", email: "david@cheninvestments.com.au", address: "8 Macquarie St, Liverpool NSW 2170", notes: "Investment property specialist" },
    ];

    for (const c of clientData) {
      await Client.findOneAndUpdate(
        { email: c.email },
        { $setOnInsert: c },
        { upsert: true }
      ).lean();
    }

    // Create sample projects
    const project1Id = generateId();
    const project2Id = generateId();
    const project3Id = generateId();

    const projectData = [
      { _id: project1Id, companyId: constructionId, name: "Smith Granny Flat", address: "15 Harbour St, Sydney NSW 2000", type: "granny_flat" as const, status: "in_progress" as const, clientId: client1Id },
      { _id: project2Id, companyId: constructionId, name: "Johnson New Home", address: "22 George St, Parramatta NSW 2150", type: "single_storey" as const, status: "pending" as const, clientId: client2Id },
      { _id: project3Id, companyId: constructionId, name: "Chen Duplex Project", address: "8 Macquarie St, Liverpool NSW 2170", type: "duplex" as const, status: "pending" as const, clientId: client3Id },
    ];

    for (const p of projectData) {
      await Project.findOneAndUpdate(
        { name: p.name },
        { $setOnInsert: p },
        { upsert: true }
      ).lean();
    }

    // Create templates
    const templateEntries = Object.entries(defaultSections);
    for (const [type, sections] of templateEntries) {
      const templateId = generateId();
      const typeName = type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      await Template.findOneAndUpdate(
        { name: `${typeName} Template`, companyId: constructionId },
        {
          $setOnInsert: {
            _id: templateId,
            companyId: constructionId,
            name: `${typeName} Template`,
            description: `Default template for ${typeName} projects`,
            projectType: type,
            isDefault: true,
            sections: sections as any,
            notes: "This is a default template. Feel free to modify as needed.",
            createdBy: adminId,
          },
        },
        { upsert: true }
      ).lean();
    }

    // Extra template types
    const extraTypes = ["villa", "extension", "knock_down_rebuild", "commercial"];
    for (const type of extraTypes) {
      const templateId = generateId();
      const typeName = type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      await Template.findOneAndUpdate(
        { name: `${typeName} Template`, companyId: constructionId },
        {
          $setOnInsert: {
            _id: templateId,
            companyId: constructionId,
            name: `${typeName} Template`,
            description: `Default template for ${typeName} projects`,
            projectType: type,
            isDefault: true,
            sections: defaultSections.renovation as any,
            notes: "This is a default template. Feel free to modify as needed.",
            createdBy: adminId,
          },
        },
        { upsert: true }
      ).lean();
    }

    // Engineering sample client
    const engClientId = generateId();
    await Client.findOneAndUpdate(
      { email: "eng.client@example.com" },
      { $setOnInsert: { _id: engClientId, companyId: engineeringId, name: "Michael Brown", companyName: "Brown Developments", phone: "0445 678 901", email: "eng.client@example.com", address: "10 Engineer Rd, Sydney NSW 2000", notes: "Engineering client" } },
      { upsert: true }
    ).lean();

    return NextResponse.json({ success: true, message: "Database seeded successfully", constructionId, engineeringId });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}