# Feature Wishes

Feature ideas for the OpenSCD project. They are currently not prioritized.

- Add the remaining [process elements to the substation editor](https://github.com/openscd/open-scd/projects/1)
- [Edit wizard for `Services` element](https://github.com/openscd/open-scd/projects/17)
- General purpose [SCL diffing tool](https://github.com/openscd/open-scd/projects/16)
- Finish the [Publisher Plugin](https://github.com/openscd/open-scd/projects/14)
- Improve [IED Editor](https://github.com/openscd/open-scd/projects/11) user experience
- Implement a more featureful [Single Line Diagram](https://github.com/openscd/open-scd/projects/7) editor that can make changes
- Implement [Log Control Block manipulation](https://github.com/openscd/open-scd/issues/148)
- Implement [Setting Group manipulation](https://github.com/openscd/open-scd/issues/149)
- Implement [Role Based Access](https://github.com/openscd/open-scd/issues/167) Control
- Finish the transition to [OpenSCD Core](https://github.com/openscd/open-scd-core/)
  - Implement the [remaining mixins](https://github.com/openscd/open-scd-core/projects?type=classic)
  - Migrate existing plugins
  - Migrate wizard library
- Support older versions of 61850-6, especially edition 1
- Data provenance
- IEC TS 61850 80-1 101 support
- IEC TR 61850 90-2 support (gateway configuration based on SCD)
- IEC TR 61850-90-11 Logic Modelling support
- IEC TS 61850-80-5 Modbus support (still in draft)
- IEC 61850-6-2 (DRAFT) HMI support
- General purpose "Update SCL Element" plugin
- Engineering Workflow Editor
- Graphical network diagram view for Communication section editor

## Transpower Input (18/01/2023)

**_NOTE: Transpower has at this time made no decision on whether we will or won't use OpenSCD for these tasks and this doesn't represent an any such undertaking but it is provided as an exploration of requirements and use cases_**

In order of priority and somewhat tailored to what seems achievable within our digital substation project's time constraints and expectations:

1. Finish transition to OpenSCD core -- as above. We expect to have a range of plugins to simplify, automate and ensure repeatable configurations and having these as separately versioned npm modules will improve visibility, maintenance and modularity.

   The kind of plugins we envision are somewhat "Transpower specific" which we intend to develop in-house but for example will include (preliminary thoughts...):

   - Correct allocation of VLAN and MAC address for SV and GOOSE traffic. For Transpower these allocations will be based on the SLD as the secondary hardware arrangements are based around buses and the primary topology
   - Having a plugin to automate deadbands by voltage level for SIPROTEC 5 devices
   - Having a plugin to export relevant information to DCIM/IPAM tools (mainly IP addresses) so configuration can be built by importing it
   - Having a plugin to export relevant information to Ansible network configuration scripting (to provide the information on what each device needs for VLANs, MAC address filtering, an augmented version of the Communication section)
   - Automation of configuration for GOOSE and SV traffic based on known configurations of merging units, protection relays. We anticipate doing this by transforming the SLD into a graph where the nodes represent terminals and the edges represent `ConductingEquipment` etc and then carrying out a terminating depth-first search to identify e.g. CTs and CBs on a bus and provide subscriptions between e.g. bus protection, transformer protection and merging units. To achieve this we need:
     - to be able to instantiate project icd files against LNodes within the substation section.
     - to have an API for GOOSE/SV publishing/subscriptions and the ability to instantiate/modify LGOS and LSVS LNs.
   - Generate logic used for interlocking (Transpower uses a somewhat novel "topology-based" interlocking based off an SSD file which generate IEC61131 logic).

1. SLD Editor

   - Transpower wishes to carry out "top-down engineering" based on the SLD editor. The Substation editor in OpenSCD already provides much of the capability required.
   - However the following are outstanding:
     - Drag and drop of SLD symbols to create elements (from voltage level, bay, transformer, conducting equipment etc.) (including the `sxy` namespace coordinates)
     - Ability to edit key parameters (voltage levels, descriptions)
     - Ability to rotate symbols
     - Ability to group objects, copy and paste and carry out basic alignment tasks (or to be connectable on a grid)
     - Ability to "flip" a group of objects (to allow a bay to drawn in a particular direction -- Transpower draws bays to match the physical orientation of the site)
     - Ability to verify/trace connectivity

1. Substation Editor. The Substation editor provides much of the desired capability but does not yet allow:

   - Connection of a an IED to a set of LNodes. (see [#1128](https://github.com/openscd/open-scd/issues/1128))
   - Ability to model the NeutralPoint of a transformer. Transpower needs to be able to assign CTRs to the neutral point of the transformer so we need to be able to model this ([#796](https://github.com/openscd/open-scd/issues/796))

1. General SCL diffing/merging tool -- this is quite a significant piece of work but is important to allow:

   - Updating of an SCD file from IID file provided by an ICT. This is needed for the round trip from e.g. DIGSI 5 where the initial ICD file is inadequate and a bay specific IID file must be used. We would like to update the IED in the system configuration tool (generated from a ICD file) with the IID from the ICT. There is always going to be a need for customisation/update of specific devices which don't match the template ICD files. (This is S110 of Table G.2 in IEC 61850-6 Ed 2.1).

   - Being able to verify changes quickly and efficiently and handle collisions/merge differences if multiple people are working on the same project (currently we would plan to use git and plain-text differencing for management of SCL files)

   - Being able to exchange one IED with another with a slightly different data model

   Some initial prototyping and ideating done by Daniel/Christian (see also: [#896](https://github.com/openscd/open-scd/issues/896), [#669](https://github.com/openscd/open-scd/issues/669), [#892](https://github.com/openscd/open-scd/issues/892), [#349](https://github.com/openscd/open-scd/issues/349))

1. Complete the publisher plugin 

   - Provide the ability to add FCDOs to RCBs to allow MMS SCADA map augmentation ([#1092](https://github.com/openscd/open-scd/issues/1092))
   - Provide subscriber oriented view for later-binding GOOSE/SMV ([#1025](https://github.com/openscd/open-scd/issues/1025))

1. Complete the subscription editors:

   - Allow DO based GOOSE subscriptions (low-priority, see [#1104](https://github.com/openscd/open-scd/issues/1104))
   - Allow reassignment or provide API to allow reassignment of LGOS and LSVS ([#1038](https://github.com/openscd/open-scd/issues/1038))
   - Support updating of configuration revision (low-priority, see [#562](https://github.com/openscd/open-scd/issues/562))
   - (If possible) allow single click three-phase connections (low-priority, see [#1088](https://github.com/openscd/open-scd/issues/1088))

1. Export IID file ([#361](https://github.com/openscd/open-scd/issues/361)) - this is useful as some software (GE Enervista) doesn't allow import of configuration parameters from an SCD file.
