const skills = [
  { name: 'C', level: 'Core Programming' },
  { name: 'C++', level: 'Problem Solving' },
  { name: 'Java', level: 'OOP Concepts' },
  { name: 'HTML', level: 'Structure' },
  { name: 'CSS', level: 'Styling' },
  { name: 'JavaScript', level: 'Interactivity' },
  { name: 'React JS', level: 'UI Development' },
  { name: 'SQL', level: 'Database Basics' },
  { name: 'GitHub', level: 'Version Control' }
]

function Skills() {
  return (
    <section className="section" id="skills">
      <div className="section-heading">
        <p className="section-label">Skills</p>
        <h2>What I Work With</h2>
      </div>
      <div className="skill-grid">
        {skills.map((skill) => (
          <div key={skill.name} className="skill-card">
            <h3>{skill.name}</h3>
            <p>{skill.level}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Skills
